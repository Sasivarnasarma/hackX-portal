# HackX Portal & Workspace

Welcome to the **HackX Portal** repository. This workspace contains the backend registration system, the main HackX user portal, and the IdeaSprint portal components.

## Project Structure

```text
├── backend/                  # FastAPI Backend API
│   ├── database/             # SQLite/PostgreSQL connection and session helpers
│   ├── models/               # SQLAlchemy models
│   ├── routes/               # API endpoint routers (OTP, HackX, HackX Jr)
│   ├── schemas/              # Pydantic schemas for validation
│   ├── main.py               # Application entry point
│   ├── Dockerfile            # Python Dockerfile
│   └── requirements.txt      # Python dependencies
│
├── frontend-user/            # HackX User Portal (React + Vite + TS)
│   ├── src/                  # React source files (components, styles, routes)
│   ├── Dockerfile            # Multi-stage production Dockerfile
│   ├── nginx.conf            # Nginx config supporting React Router
│   └── package.json          # Node dependencies and scripts
│
├── ideasprint-portal/        # IdeaSprint Components
│   ├── HackX-home/           # Static HackX Landing website
│   └── frontend-user/        # IdeaSprint Frontend Application (React + Vite)
│
└── docker-compose.yml        # Roots Docker Compose configuration
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **pnpm** (or npm/yarn)

---

### 2. Backend Setup (`/backend`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in the values:
     ```bash
     cp .env.example .env
     ```
5. Run the FastAPI application:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will be available at [http://localhost:8000](http://localhost:8000). Swagger documentation will be available at `http://localhost:8000/docs` (when `ENVIRONMENT=development`).

---

### 3. Frontend Setup (`/frontend-user`)

1. Navigate to the frontend directory:
   ```bash
   cd frontend-user
   ```
2. Install node dependencies:
   ```bash
   pnpm install
   ```
3. Configure environment variables:
   - Ensure the `.env` file points to your local backend:
     ```env
     VITE_API_BASE_URL=http://localhost:8000
     VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
     ```
4. Run the frontend in development mode:
   ```bash
   pnpm dev
   ```
   The user portal will be available at [http://localhost:5173](http://localhost:5173).

---

## 🐳 Running with Docker Compose

If you have **Docker** installed, you can build and run both the backend and frontend services using a single command from the root of the project:

### 1. Build and Start the Services
```bash
docker compose up --build -d
```

Once running:
- **FastAPI Backend API**: Accessible at [http://localhost:8000](http://localhost:8000)
- **HackX Frontend Portal**: Accessible at [http://localhost:3000](http://localhost:3000)

### 2. Database & Data Persistence
The backend service maps the SQLite database to `./backend/hackx.db` on the host machine. This ensures that registrations and data are not lost when container states change or are destroyed.

### 3. Stop the Services
```bash
docker compose down
```

---

## 📜 Key Scripts Summary

| Directory | Command | Description |
| :--- | :--- | :--- |
| **Root** | `docker compose up --build -d` | Build and start all services via Docker |
| **Root** | `docker compose down` | Tear down running docker containers |
| **`/backend`** | `uvicorn main:app --reload` | Run Python backend with hot reload |
| **`/frontend-user`** | `pnpm dev` | Start frontend developer server |
| **`/frontend-user`** | `pnpm build` | Compile frontend assets to `/dist` |
