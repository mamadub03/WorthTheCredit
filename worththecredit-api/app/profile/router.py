"""GET /profile (404 "profile_not_found" if none) and PUT /profile (create or replace)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.db import get_db
from app.profile.models import StudentProfile
from app.profile.schemas import ProfileIn, ProfileOut

router = APIRouter(prefix="/profile", tags=["profile"])

FIELDS = ("major", "interests", "skills", "career_goals", "personal_interests", "degree_requirements")


def profile_to_out(p: StudentProfile) -> ProfileOut:
    return ProfileOut(**{f: getattr(p, f) for f in FIELDS}, updated_at=p.updated_at)


def load_profile(db: Session, user_id: int) -> ProfileIn | None:
    """Used by recommendations when the request has no profile."""
    p = db.get(StudentProfile, user_id)
    return ProfileIn(**{f: getattr(p, f) for f in FIELDS}) if p else None


@router.get("", response_model=ProfileOut)
def get_profile(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileOut:
    p = db.get(StudentProfile, user.id)
    if p is None:
        raise HTTPException(status_code=404, detail="profile_not_found")
    return profile_to_out(p)


@router.put("", response_model=ProfileOut)
def put_profile(
    body: ProfileIn, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> ProfileOut:
    p = db.get(StudentProfile, user.id)
    if p is None:
        p = StudentProfile(user_id=user.id, **body.model_dump())
        db.add(p)
    else:
        for key, value in body.model_dump().items():
            setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return profile_to_out(p)
