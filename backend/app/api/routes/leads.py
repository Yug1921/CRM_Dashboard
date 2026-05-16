from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import db_dep
from app.models.models import LeadDiscoveryQueue, Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut
from app.services import lead_service
from app.core.config import settings
from app.services.openrouter_client import OpenRouterClient

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadDraftOut(BaseModel):
    lead_id: UUID
    queue_id: Optional[UUID] = None
    message_draft: Optional[str] = None
    source: str


class DraftRequest(BaseModel):
    outreach_type: str
    tone: str
    custom_note: Optional[str] = None


class DraftResponse(BaseModel):
    draft: str
    lead_id: UUID
    outreach_type: str
    tokens_used: int


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(db_dep)):
    return lead_service.create_lead(db, payload)


@router.get("", response_model=List[LeadOut])
def list_leads(
    db: Session = Depends(db_dep),
    category: Optional[str] = None,
    status_: Optional[str] = Query(default=None, alias="status"),
    country: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    return lead_service.list_leads(
        db=db,
        category=category,
        status=status_,
        country=country,
        limit=limit,
        offset=offset,
    )


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: UUID, db: Session = Depends(db_dep)):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/{lead_id}/draft", response_model=LeadDraftOut)
def get_lead_draft(lead_id: UUID, db: Session = Depends(db_dep)):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    queue_row = db.execute(
        select(LeadDiscoveryQueue)
        .where(LeadDiscoveryQueue.lead_id == lead_id)
        .order_by(LeadDiscoveryQueue.updated_at.desc())
    ).scalars().first()

    if queue_row:
        raw_data = queue_row.raw_data or {}
        ai_data = raw_data.get("ai") or {}
        message_draft = ai_data.get("message_draft")
        if message_draft:
            return LeadDraftOut(
                lead_id=lead_id,
                queue_id=queue_row.id,
                message_draft=message_draft,
                source="queue",
            )

    if lead.ai_outreach_template:
        return LeadDraftOut(
            lead_id=lead_id,
            queue_id=None,
            message_draft=lead.ai_outreach_template,
            source="lead",
        )

    raise HTTPException(status_code=404, detail="No AI draft found for this lead")


@router.post("/{lead_id}/draft", response_model=DraftResponse)
def create_lead_draft(lead_id: UUID, payload: DraftRequest, db: Session = Depends(db_dep)):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    raw = lead.raw_data or {}

    system = (
        "You are an SDR assistant for GoTeeOff CRM."
        " Return ONLY a JSON object with a single key 'draft' whose value is the outreach message string."
        " Do not include any extra commentary."
    )

    user_parts = [
        f"Lead name: {lead.full_name}",
        f"Company: {lead.company_or_brand or ''}",
        f"Headline: {raw.get('headline','')}",
        f"Bio: {lead.bio or raw.get('about','') or ''}",
        f"Outreach type: {payload.outreach_type}",
        f"Tone: {payload.tone}",
    ]

    if payload.custom_note:
        user_parts.append(f"Custom note: {payload.custom_note}")

    # enforce length limits
    max_chars = 300 if payload.outreach_type == "connection_request" else 500
    user_parts.append(f"Length limit: {max_chars} characters max.")

    user = "\n".join(user_parts)

    try:
        client = OpenRouterClient(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            model=getattr(settings, "OPENROUTER_MODEL", "mistralai/mistral-7b-instruct"),
        )

        ai_obj = client.chat_json(system=system, user=user, max_tokens=400)

        draft = None
        if isinstance(ai_obj, dict):
            draft = ai_obj.get("draft")

        if not draft or not isinstance(draft, str):
            raise Exception("AI did not return a valid draft")

        draft = draft.strip()
        if len(draft) > max_chars:
            draft = draft[:max_chars]

        lead.ai_draft_message = draft
        db.commit()

        tokens_used = len(draft)

        return DraftResponse(
            draft=draft,
            lead_id=lead.id,
            outreach_type=payload.outreach_type,
            tokens_used=tokens_used,
        )

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: UUID, payload: LeadUpdate, db: Session = Depends(db_dep)):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead_service.update_lead(db, lead, payload)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: UUID, db: Session = Depends(db_dep)):
    lead = lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead_service.delete_lead(db, lead)
    return None