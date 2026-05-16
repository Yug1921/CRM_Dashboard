from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.models import Lead
from app.schemas.lead import LeadCreate, LeadUpdate


def create_lead(db: Session, payload: LeadCreate) -> Lead:
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead(db: Session, lead_id: UUID) -> Optional[Lead]:
    return db.get(Lead, lead_id)


def list_leads(
    db: Session,
    category: Optional[str] = None,
    status: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Lead]:
    stmt = select(Lead).order_by(Lead.created_at.desc())

    if category:
        stmt = stmt.where(Lead.category == category)
    if status:
        stmt = stmt.where(Lead.status == status)
    if country:
        stmt = stmt.where(Lead.country == country)

    stmt = stmt.limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def update_lead(db: Session, lead: Lead, payload: LeadUpdate) -> Lead:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(lead, k, v)

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead: Lead) -> None:
    db.delete(lead)
    db.commit()