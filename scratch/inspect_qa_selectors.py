import re

with open('scripts/browser_qa_suite.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for QA-01 to QA-04 in browser_qa_suite.py
for line in text.splitlines():
    if any(k in line for k in ['QA-01', 'QA-02', 'QA-03', 'QA-04', 'header', 'nav', 'Open Workspace', 'Enter the Workspace', 'button']):
        if 'record(' in line or 'page.' in line or 'expect(' in line:
            print(line.strip())
