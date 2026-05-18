from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.models import Lead
from app.schemas.lead import LeadOut

router = APIRouter()


@router.websocket("/ws/leads/live")
async def live_leads(websocket: WebSocket):
    await websocket.accept()
    db = SessionLocal()
    last_seen_created_at = datetime.now(timezone.utc)

    try:
        while True:
            rows = db.execute(
                select(Lead)
                .where(Lead.created_at > last_seen_created_at)
                .order_by(Lead.created_at.asc())
            ).scalars().all()

            for lead in rows:
                last_seen_created_at = lead.created_at or last_seen_created_at
                await websocket.send_json(
                    {
                        "event": "new_lead",
                        "data": LeadOut.model_validate(lead).model_dump(mode="json"),
                    }
                )

            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
    finally:
        db.close()