import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.database import Base
from app.api.deps import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def register_and_login(email="test@test.com", password="password123"):
    client.post("/register", json={"email": email, "password": password})
    res = client.post("/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── AUTH TESTS ──

def test_register_success():
    res = client.post("/register", json={"email": "user@test.com", "password": "pass123"})
    assert res.status_code == 201
    assert res.json()["email"] == "user@test.com"


def test_register_duplicate_email():
    client.post("/register", json={"email": "dup@test.com", "password": "pass123"})
    res = client.post("/register", json={"email": "dup@test.com", "password": "pass123"})
    assert res.status_code == 400


def test_login_success():
    client.post("/register", json={"email": "login@test.com", "password": "pass123"})
    res = client.post("/login", json={"email": "login@test.com", "password": "pass123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    client.post("/register", json={"email": "bad@test.com", "password": "pass123"})
    res = client.post("/login", json={"email": "bad@test.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_login_nonexistent_user():
    res = client.post("/login", json={"email": "nope@test.com", "password": "pass"})
    assert res.status_code == 401


# ── TASK TESTS ──

def test_create_task():
    token = register_and_login()
    res = client.post("/tasks", json={"title": "Test Task"}, headers=auth_headers(token))
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Test Task"
    assert data["completed"] is False


def test_create_task_unauthorized():
    res = client.post("/tasks", json={"title": "No auth"})
    assert res.status_code == 401


def test_get_all_tasks():
    token = register_and_login()
    headers = auth_headers(token)
    client.post("/tasks", json={"title": "Task 1"}, headers=headers)
    client.post("/tasks", json={"title": "Task 2"}, headers=headers)
    res = client.get("/tasks", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["tasks"]) == 2


def test_get_tasks_pagination():
    token = register_and_login()
    headers = auth_headers(token)
    for i in range(5):
        client.post("/tasks", json={"title": f"Task {i}"}, headers=headers)
    res = client.get("/tasks?page=1&page_size=3", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5
    assert len(data["tasks"]) == 3


def test_filter_completed_tasks():
    token = register_and_login()
    headers = auth_headers(token)
    res = client.post("/tasks", json={"title": "Will complete"}, headers=headers)
    task_id = res.json()["id"]
    client.post("/tasks", json={"title": "Will stay pending"}, headers=headers)
    client.put(f"/tasks/{task_id}", json={"completed": True}, headers=headers)

    res = client.get("/tasks?completed=true", headers=headers)
    assert res.json()["total"] == 1

    res = client.get("/tasks?completed=false", headers=headers)
    assert res.json()["total"] == 1


def test_get_single_task():
    token = register_and_login()
    headers = auth_headers(token)
    create_res = client.post("/tasks", json={"title": "Specific"}, headers=headers)
    task_id = create_res.json()["id"]
    res = client.get(f"/tasks/{task_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Specific"


def test_get_task_not_found():
    token = register_and_login()
    res = client.get("/tasks/999", headers=auth_headers(token))
    assert res.status_code == 404


def test_mark_task_completed():
    token = register_and_login()
    headers = auth_headers(token)
    res = client.post("/tasks", json={"title": "Finish me"}, headers=headers)
    task_id = res.json()["id"]
    res = client.put(f"/tasks/{task_id}", json={"completed": True}, headers=headers)
    assert res.status_code == 200
    assert res.json()["completed"] is True


def test_delete_task():
    token = register_and_login()
    headers = auth_headers(token)
    res = client.post("/tasks", json={"title": "Delete me"}, headers=headers)
    task_id = res.json()["id"]
    res = client.delete(f"/tasks/{task_id}", headers=headers)
    assert res.status_code == 200
    res = client.get(f"/tasks/{task_id}", headers=headers)
    assert res.status_code == 404


def test_user_cannot_access_other_users_tasks():
    token1 = register_and_login("user1@test.com", "pass1")
    token2 = register_and_login("user2@test.com", "pass2")
    res = client.post("/tasks", json={"title": "Private task"}, headers=auth_headers(token1))
    task_id = res.json()["id"]
    res = client.get(f"/tasks/{task_id}", headers=auth_headers(token2))
    assert res.status_code == 404


def test_invalid_token():
    res = client.get("/tasks", headers={"Authorization": "Bearer fake.token.here"})
    assert res.status_code == 401
