from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, or_, and_, func

from app.db.database import SessionLocal
from app.models.models import Lead
from app.schemas.lead import LeadOut

router = APIRouter()


@router.websocket("/ws/leads/live")
async def live_leads(websocket: WebSocket):
    await websocket.accept()
    db = SessionLocal()
    last_seen_created_at = db.execute(select(func.now())).scalar_one()
    last_seen_id: UUID = UUID(int=0)

    try:
        while True:
            condition = or_(
                Lead.created_at > last_seen_created_at,
                and_(Lead.created_at == last_seen_created_at, Lead.id > last_seen_id),
            )

            rows = db.execute(
                select(Lead)
                .where(condition)
                .order_by(Lead.created_at.asc(), Lead.id.asc())
            ).scalars().all()

            for lead in rows:
                last_seen_created_at = lead.created_at or last_seen_created_at
                last_seen_id = lead.id
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