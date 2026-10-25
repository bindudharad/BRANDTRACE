import os
import sys
import tempfile
from pathlib import Path

# Create an isolated temporary SQLite database for all test executions
_test_db_fd, _test_db_path = tempfile.mkstemp(suffix=".test.db")
os.close(_test_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models import init_db
init_db()
