from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.plaid import router as plaid_router
from app.api.zakat import router as zakat_router
from app.api.assets import router as assets_router
from app.api.liabilities import router as liabilities_router
from app.api.profile import router as profile_router
from app.api.nisab import router as nisab_router
from app.api.hawl import router as hawl_router
from app.api.notifications import router as notifications_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(profile_router, prefix="/api/auth", tags=["auth"])
app.include_router(assets_router, prefix="/api/assets", tags=["assets"])
app.include_router(liabilities_router, prefix="/api/liabilities", tags=["liabilities"])
app.include_router(zakat_router, prefix="/api/zakat", tags=["zakat"])
app.include_router(nisab_router, prefix="/api/nisab", tags=["nisab"])
app.include_router(plaid_router, prefix="/api/plaid", tags=["plaid"])
app.include_router(hawl_router, prefix="/api/hawl", tags=["hawl"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
