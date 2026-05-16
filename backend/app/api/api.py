from fastapi import APIRouter
from app.api.routes import health, leads, ingest, meta, outreach
from app.api.routes import ai

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(leads.router)
api_router.include_router(ingest.router)
api_router.include_router(meta.router)
api_router.include_router(ai.router)
api_router.include_router(outreach.router)