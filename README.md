# TaskFlow – Task Manager

A full-stack Task Manager web application built with **FastAPI** (backend) and plain **HTML/CSS/JS** (frontend).

## Features

- JWT-based authentication (register & login)
- Create, view, complete, and delete tasks
- Pagination and filtering by completion status
- Clean, animated frontend served from FastAPI
- SQLite database (easy swap to PostgreSQL)
- Full test suite with pytest

---

## Project Structure

```
taskmanager/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── api/
│   │   ├── deps.py          # Auth dependency
│   │   └── routes/
│   │       ├── auth.py      # /register, /login
│   │       └── tasks.py     # /tasks CRUD
│   ├── core/
│   │   ├── config.py        # Environment config
│   │   └── security.py      # Password hashing, JWT
│   ├── db/
│   │   ├── database.py      # SQLAlchemy engine & session
│   │   └── models.py        # User & Task models
│   └── schemas/
│       ├── user.py          # Pydantic user schemas
│       └── task.py          # Pydantic task schemas
├── frontend/
│   └── index.html           # Single-page frontend
├── tests/
│   └── test_api.py          # Pytest test suite
├── .env.example
├── .gitignore
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=sqlite:///./taskmanager.db
```

> **Never commit your `.env` file.**

---

## Running Locally

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd taskmanager
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your SECRET_KEY
```

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.  
API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Running Tests

```bash
pytest tests/ -v
```

---

## Docker

```bash
docker build -t taskflow .
docker run -p 8000:8000 --env-file .env taskflow
```

---

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `SECRET_KEY`, `DATABASE_URL`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login and get JWT token |
| POST | `/tasks` | Yes | Create a task |
| GET | `/tasks` | Yes | List tasks (paginated, filterable) |
| GET | `/tasks/{id}` | Yes | Get a specific task |
| PUT | `/tasks/{id}` | Yes | Update task (mark complete) |
| DELETE | `/tasks/{id}` | Yes | Delete a task |

Query params for `GET /tasks`: `page`, `page_size`, `completed=true/false`
