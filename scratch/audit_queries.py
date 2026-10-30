import re

with open(r'backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all @app. routes
route_pattern = re.compile(r'@app\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']', re.IGNORECASE)
matches = list(route_pattern.finditer(content))
print(f"Total routes matched: {len(matches)}")

endpoints = []
for i, m in enumerate(matches):
    start = m.start()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
    method = m.group(1).upper()
    path = m.group(2)
    snippet = content[start:end]
    endpoints.append((method, path, snippet))

tables = ['rules', 'facts', 'reviews', 'findings', 'audit', 'brand_assets', 'brand_profiles', 'rule_suggestions', 'evidence_dependencies']

for method, path, snippet in endpoints:
    sig_end = snippet.find("):\n")
    sig = snippet[:sig_end + 2] if sig_end != -1 else snippet[:300]
    has_ws = "workspace_id" in sig
    
    # Extract SQL
    sqls = re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"[^"\n]+"|\'[^\'\n]+\'', snippet)
    suspicious = []
    for s in sqls:
        s_clean = " ".join(s.split())
        if any(w in s_clean.upper() for w in ["SELECT", "UPDATE", "DELETE", "INSERT"]):
            for t in tables:
                if re.search(rf'\b{t}\b', s_clean, re.I):
                    if "workspace_id" not in s_clean and "workspaces" not in s_clean:
                        # Ignore system checks
                        if "sqlite_master" not in s_clean and "information_schema" not in s_clean:
                            suspicious.append((t, s_clean[:120]))
    if suspicious:
        print(f"\n{method} {path} (has ws in sig: {has_ws}):")
        for t, s in suspicious:
            print(f"   [{t}] -> {s}")
