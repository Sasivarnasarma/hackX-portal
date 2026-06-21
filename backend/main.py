import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()
is_env_loaded = os.getenv("ENV_LOADED", "false")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("log.log", "w", "utf-8"), logging.StreamHandler()],
    level=logging.INFO,
)
logger = logging.getLogger(__name__)
logging.getLogger("googleapiclient.discovery_cache").setLevel(logging.WARNING)
logger.info(f"Environment variables loaded status: {is_env_loaded}")

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.concurrency import run_in_threadpool  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from slowapi import Limiter  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from slowapi.util import get_remote_address  # noqa: E402
from starlette.exceptions import HTTPException as StarletteHTTPException  # noqa: E402

from database.connection import Base, engine  # noqa: E402
from helpers.exception_handlers import (  # noqa: E402
    global_exception_handler,
    http_exception_handler,
    rate_limit_handler,
    validation_exception_handler,
)
from helpers.oauth import verify_oauth_token_on_startup  # noqa: E402
from helpers.otp_store import cleanup_expired_otps  # noqa: E402
from helpers.email import (  # noqa: E402
    initialize_email_stats_cache,
    email_stats_reset_scheduler,
)
from routes import (  # noqa: E402
    otp_router,
    register_jr_router,
    register_x_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lifespan: Starting application. Initializing database schema...")
    try:
        async with engine.begin() as conn:
            # Create all tables dynamically on startup
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Lifespan: Database schema synchronized.")
    except Exception as e:
        logger.error(f"Lifespan: Database schema synchronization failed: {e}")

    logger.info("Lifespan: Initializing email stats cache...")
    try:
        await initialize_email_stats_cache()
    except Exception as e:
        logger.error(f"Lifespan: Email stats cache initialization failed: {e}")

    logger.info(
        "Lifespan: Registering in-memory OTP vault garbage collection cleaner..."
    )
    cleanup_task = asyncio.create_task(cleanup_expired_otps())
    reset_scheduler_task = asyncio.create_task(email_stats_reset_scheduler())

    logger.info("Lifespan: Initiating Google Sheets diagnostic self-checks...")
    try:
        await run_in_threadpool(verify_oauth_token_on_startup)
    except Exception as e:
        logger.error(f"Lifespan: Google Sheets diagnostic self-checks failed: {e}")

    yield

    logger.info(
        "Lifespan: Shutting down application. Terminating cleaner and scheduler threads..."
    )
    cleanup_task.cancel()
    reset_scheduler_task.cancel()
    logger.info("Lifespan: Application shutdown complete.")


# Environment setting: "development" or "production"
env = os.getenv("ENVIRONMENT", "production").lower()
is_dev = env == "development"
logger.info(f"Active application environment: {env.upper()} (is_dev={is_dev})")

app = FastAPI(
    title="HackX 2026 Registration Backend",
    openapi_url="/openapi.json" if is_dev else None,
    docs_url="/docs" if is_dev else None,
    redoc_url="/redoc" if is_dev else None,
    lifespan=lifespan,
)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter

# Register global exception handlers
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# CORS Configuration
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Mounting
app.include_router(otp_router)
app.include_router(register_x_router)
app.include_router(register_jr_router)


@app.get("/")
@limiter.limit("10/minute")
def read_root(request: Request):
    return {
        "message": "Ah, you found the API. Now, what's your plan? 🙃",
        "dev": "Sasivarnasarma",
    }


@app.api_route(
    "/{path_name:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
@limiter.limit("10/minute")
def catch_all_404(request: Request, path_name: str):
    raise StarletteHTTPException(
        status_code=404, detail=f"Path '/{path_name}' not found."
    )
