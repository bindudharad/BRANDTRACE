import os
import sys
import tempfile
from pathlib import Path
import pytest

_created_temp_db = None

# Create an isolated temporary SQLite database for test executions unless already configured
if "DATABASE_URL" not in os.environ:
    _test_db_fd, _test_db_path = tempfile.mkstemp(suffix=".test.db")
    os.close(_test_db_fd)
    os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"
    _created_temp_db = _test_db_path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models import init_db, get_engine
init_db()

@pytest.fixture(scope="session", autouse=True)
def report_and_assert_database_target():
    """Verify and report the actual engine dialect and target database for this test session."""
    engine = get_engine()
    dialect = engine.dialect.name
    host = getattr(engine.url, "host", None)
    port = getattr(engine.url, "port", None)
    database = getattr(engine.url, "database", None)

    # Prove database dialect inside executing process
    print(f"\n[PYTEST SESSION DB PROOF] dialect={dialect} host={host} port={port} database={database}", flush=True)

    if os.environ.get("ASSERT_POSTGRESQL") == "1":
        expected_port = int(os.environ.get("EXPECTED_PG_PORT", "5438"))
        assert dialect == "postgresql", f"ASSERTION FAILED: Expected PostgreSQL engine dialect, but running on {dialect}!"
        assert port == expected_port, f"ASSERTION FAILED: Expected PostgreSQL port {expected_port}, but running on {port}!"
        assert database == "brandtrace_disposable_test", f"ASSERTION FAILED: Expected disposable DB, but got {database}!"

    yield

    # Cleanup test-owned SQLite file if one was created
    if _created_temp_db and os.path.exists(_created_temp_db):
        try:
            get_engine().dispose()
            os.remove(_created_temp_db)
        except Exception:
            pass
