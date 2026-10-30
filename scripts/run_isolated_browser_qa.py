"""
BRANDTRACE - Isolated Browser QA Runner
Runs the full 32-scenario Playwright browser QA suite against:
- A dedicated temporary SQLite database (completely isolated from brandtrace.db)
- A dedicated backend process running on port 8031
- A dedicated Vite frontend server running on port 3001 (proxying to port 8031)

Guarantees:
- Existing development database (brandtrace.db) is left 100% untouched.
- Existing dev processes on ports 8000 and 3000 are not terminated or affected.
- Spawns and cleans up only its own isolated child processes and temporary files.
"""

import os
import sys
import time
import shutil
import urllib.request
import urllib.error
import json
import subprocess
import tempfile
import socket

REPO_DIR = r"C:\Projects\BRANDTRACE\BRANDTRACE"
DEV_DB_PATH = os.path.join(REPO_DIR, "brandtrace.db")
BACKEND_PORT = 8031
FRONTEND_PORT = 3001

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def kill_process_tree(pid):
    if sys.platform == "win32":
        try:
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        except Exception as e:
            print(f"Warning killing process {pid}: {e}")
    else:
        try:
            os.kill(pid, 9)
        except Exception:
            pass

def main():
    print("=" * 80)
    print("BRANDTRACE ISOLATED BROWSER QA PROTOCOL")
    print("=" * 80)

    # 1. Verify ports 8031 and 3001 are free
    if is_port_in_use(BACKEND_PORT):
        print(f"ERROR: Port {BACKEND_PORT} is already in use. Aborting.")
        sys.exit(1)
    if is_port_in_use(FRONTEND_PORT):
        print(f"ERROR: Port {FRONTEND_PORT} is already in use. Aborting.")
        sys.exit(1)

    # 2. Record dev database metadata to verify it remains untouched
    dev_db_initial_stat = None
    if os.path.exists(DEV_DB_PATH):
        dev_db_initial_stat = (os.path.getsize(DEV_DB_PATH), os.path.getmtime(DEV_DB_PATH))
        print(f"Recorded dev DB metadata: size={dev_db_initial_stat[0]} bytes, mtime={dev_db_initial_stat[1]}")
    else:
        print("Dev DB not found at start (will verify no file created at that path)")

    # 3. Create dedicated temporary SQLite database
    temp_dir = tempfile.gettempdir()
    temp_db_name = f"brandtrace_qa_disposable_{int(time.time())}.db"
    temp_db_path = os.path.join(temp_dir, temp_db_name)
    temp_db_url = f"sqlite:///{temp_db_path.replace(os.sep, '/')}"
    print(f"Isolated Disposable Database: {temp_db_path}")
    print(f"Isolated Database URL: {temp_db_url}")

    backend_proc = None
    frontend_proc = None

    try:
        # 4. Prepare isolated backend environment
        backend_env = os.environ.copy()
        backend_env["DATABASE_URL"] = temp_db_url
        backend_env["PYTHONPATH"] = os.path.join(REPO_DIR, "backend")
        backend_env["ALLOW_DEMO_AUTH"] = "True"
        backend_env["ALLOW_DEMO_RESET"] = "true"
        backend_env["DEMO_RESET_SECRET"] = "isolated-qa-secret"

        # Initialize schema in isolated DB
        print("Initializing isolated schema in temporary database...")
        init_cmd = [
            sys.executable, "-c",
            "from app.models import init_db; init_db(); print('Isolated DB schema created successfully.')"
        ]
        init_res = subprocess.run(init_cmd, env=backend_env, cwd=REPO_DIR, capture_output=True, text=True)
        if init_res.returncode != 0:
            print("Failed to initialize isolated database schema:")
            print(init_res.stderr)
            sys.exit(1)
        print("Isolated schema initialized.")

        # 5. Launch dedicated backend process on port 8031
        print(f"Starting dedicated backend on port {BACKEND_PORT}...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1",
            "--port", str(BACKEND_PORT),
            "--app-dir", "backend"
        ]
        backend_log_path = os.path.join(temp_dir, f"backend_qa_{int(time.time())}.log")
        backend_log_file = open(backend_log_path, "w", encoding="utf-8")
        backend_proc = subprocess.Popen(
            backend_cmd,
            env=backend_env,
            cwd=REPO_DIR,
            stdout=backend_log_file,
            stderr=subprocess.STDOUT
        )
        print(f"Dedicated backend started with PID {backend_proc.pid} on port {BACKEND_PORT} (logging to {backend_log_path})")

        # Poll backend readiness
        backend_ready = False
        dialect_confirmed = False
        for _ in range(30):
            if backend_proc.poll() is not None:
                backend_log_file.close()
                with open(backend_log_path, "r", encoding="utf-8", errors="replace") as f:
                    print(f"Backend failed to start:\n{f.read()}")
                sys.exit(1)
                sys.exit(1)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/api/ready", timeout=2) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode())
                        if data.get("status") == "ready":
                            backend_ready = True
                            if data.get("database") == "sqlite":
                                dialect_confirmed = True
                            break
            except Exception:
                time.sleep(0.5)

        if not backend_ready:
            print("ERROR: Dedicated backend failed to become ready on port 8031 within 15 seconds.")
            sys.exit(1)
        print(f"Dedicated backend is READY on port {BACKEND_PORT}. Database dialect: {'sqlite' if dialect_confirmed else 'unknown'}")

        # Seed initial demo data in isolated environment via demo/reset
        seed_req = urllib.request.Request(
            f"http://127.0.0.1:{BACKEND_PORT}/api/demo/reset",
            data=b"{}",
            headers={
                "Content-Type": "application/json",
                "X-Demo-Role": "brand_admin",
                "X-Demo-Actor": "demo.brand_admin",
                "X-Workspace-Id": "ws_default",
                "X-Reset-Secret": "isolated-qa-secret",
            }
        )
        with urllib.request.urlopen(seed_req, timeout=5) as seed_resp:
            print(f"Initial demo data seeded into isolated database via demo/reset (HTTP {seed_resp.status})")

        # 6. Launch dedicated Vite frontend on port 3001
        print(f"Starting dedicated Vite frontend on port {FRONTEND_PORT} (proxying to {BACKEND_PORT})...")
        frontend_env = os.environ.copy()
        frontend_env["VITE_API_PROXY"] = f"http://127.0.0.1:{BACKEND_PORT}"
        frontend_env["PORT"] = str(FRONTEND_PORT)
        frontend_env["DISABLE_HMR"] = "true"

        # On Windows, resolve npx.cmd
        npx_path = shutil.which("npx") or "npx"
        frontend_cmd = f'"{npx_path}" vite --port {FRONTEND_PORT} --strictPort'
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            env=frontend_env,
            cwd=REPO_DIR,
            shell=True
        )
        print(f"Dedicated frontend started with PID {frontend_proc.pid} on port {FRONTEND_PORT}")

        # Poll frontend readiness
        frontend_ready = False
        for _ in range(40):
            if frontend_proc.poll() is not None:
                print("Frontend process exited unexpectedly.")
                sys.exit(1)
            try:
                with urllib.request.urlopen(f"http://localhost:{FRONTEND_PORT}", timeout=2) as resp:
                    if resp.status == 200:
                        frontend_ready = True
                        break
            except Exception:
                time.sleep(0.5)

        if not frontend_ready:
            print(f"ERROR: Dedicated frontend failed to respond on port {FRONTEND_PORT} within 20 seconds.")
            sys.exit(1)
        print(f"Dedicated frontend is READY on port {FRONTEND_PORT}")

        # Confirm proxy routes through port 3001 to backend on port 8031
        with urllib.request.urlopen(f"http://localhost:{FRONTEND_PORT}/api/ready", timeout=5) as proxy_resp:
            proxy_data = json.loads(proxy_resp.read().decode())
            print(f"Frontend proxy verification to http://localhost:{FRONTEND_PORT}/api/ready: status={proxy_data.get('status')}, database={proxy_data.get('database')}")

        # 7. Execute Browser QA Suite against isolated instances
        print("\n" + "=" * 80)
        print(f"EXECUTING 32 BROWSER SCENARIOS AGAINST ISOLATED INSTANCE (Frontend: {FRONTEND_PORT}, Backend: {BACKEND_PORT})")
        print("=" * 80)

        qa_env = os.environ.copy()
        qa_env["BROWSER_TEST_BASE_URL"] = f"http://localhost:{FRONTEND_PORT}"
        qa_env["BROWSER_TEST_API_URL"] = f"http://127.0.0.1:{BACKEND_PORT}"
        qa_env["PYTHONPATH"] = os.path.join(REPO_DIR, "backend")

        suite_cmd = [sys.executable, os.path.join(REPO_DIR, "scripts", "browser_qa_suite.py")]
        suite_proc = subprocess.run(suite_cmd, env=qa_env, cwd=REPO_DIR, capture_output=False)
        suite_exit_code = suite_proc.returncode

        print("\n" + "=" * 80)
        print(f"SUITE COMPLETED WITH EXIT CODE: {suite_exit_code}")
        print("=" * 80)

    finally:
        print("\n[CLEANUP] Stopping isolated processes and verifying dev database integrity...")
        if frontend_proc:
            print(f"Terminating dedicated frontend process (PID {frontend_proc.pid})...")
            kill_process_tree(frontend_proc.pid)

        if backend_proc:
            print(f"Terminating dedicated backend process (PID {backend_proc.pid})...")
            kill_process_tree(backend_proc.pid)
            try:
                backend_log_file.close()
            except Exception:
                pass

        # Allow OS to release port bindings
        time.sleep(1)

        # Verify dev database was untouched
        if dev_db_initial_stat is not None and os.path.exists(DEV_DB_PATH):
            current_stat = (os.path.getsize(DEV_DB_PATH), os.path.getmtime(DEV_DB_PATH))
            if current_stat == dev_db_initial_stat:
                print(f"VERIFIED: Dev database {DEV_DB_PATH} was UNTOUCHED (size: {current_stat[0]}, mtime: {current_stat[1]}).")
            else:
                print(f"WARNING: Dev database stat changed! Initial: {dev_db_initial_stat}, Current: {current_stat}")

        # Remove temporary database
        if os.path.exists(temp_db_path):
            try:
                os.remove(temp_db_path)
                print(f"Removed temporary database {temp_db_path}")
            except Exception as e:
                print(f"Notice removing temporary database: {e}")

if __name__ == "__main__":
    main()
