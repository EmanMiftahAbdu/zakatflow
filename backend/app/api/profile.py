from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.schemas.profile import ProfileUpdate, ProfileResponse

router = APIRouter()


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Profile not found")
    return result.data[0]


@router.post("/profile", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = (
        supabase.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Profile not found")
    return result.data[0]
