import logging
import os

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Format RateLimitExceeded into unified professional JSON.
    """
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "status": "error",
            "message": "Too many requests. Please slow down and try again later.",
            "errors": [
                {
                    "field": "rate_limiter",
                    "message": f"Rate limit exceeded: {exc.detail or 'Too many requests'}",
                }
            ],
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Overriding FastAPI default 422 handlers to format Pydantic validation errors into our unified schema.
    """
    errors_list = []
    for err in exc.errors():
        # Clean path notation for complex nested arrays (e.g. members -> 0 -> phone)
        loc = err.get("loc", [])
        if len(loc) > 1:
            field_name = " -> ".join(str(item) for item in loc[1:])
        elif len(loc) == 1:
            field_name = str(loc[0])
        else:
            field_name = "unknown"

        errors_list.append(
            {
                "field": field_name,
                "message": err.get("msg", "Validation failed for this input."),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": "error",
            "message": "Data validation failed. Please correct your inputs.",
            "errors": errors_list,
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Overriding standard HTTP exceptions to return clean JSON structure.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": str(exc.detail),
            "errors": [
                {
                    "field": "http_request",
                    "message": f"HTTP status error: {exc.status_code}",
                }
            ],
        },
    )


async def global_exception_handler(request: Request, exc: Exception):
    """
    Global backup interceptor formatting unexpected errors into professional JSON.
    """
    logger.error(f"Unhandled system exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An unexpected error occurred on the server.",
            "errors": [
                {
                    "field": "server_internal",
                    "message": str(exc)
                    if os.getenv("DEBUG", "false").lower() == "true"
                    else "Contact system administrators.",
                }
            ],
        },
    )
