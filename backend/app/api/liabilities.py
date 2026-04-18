from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.schemas.liabilities import LiabilityCreate, LiabilityUpdate, LiabilityResponse

router = APIRouter()


@router.get("", response_model=list[LiabilityResponse])
async def list_liabilities(user_id: str = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("liabilities").select("*").eq("user_id", user_id).execute()
    return result.data


@router.post("", response_model=LiabilityResponse, status_code=201)
async def create_liability(
    body: LiabilityCreate,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    data = body.model_dump()
    data["user_id"] = user_id
    result = supabase.table("liabilities").insert(data).execute()
    return result.data[0]


@router.put("/{liability_id}", response_model=LiabilityResponse)
async def update_liability(
    liability_id: str,
    body: LiabilityUpdate,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = (
        supabase.table("liabilities")
        .update(update_data)
        .eq("id", liability_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Liability not found")
    return result.data[0]


@router.delete("/{liability_id}", status_code=204)
async def delete_liability(
    liability_id: str,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    result = (
        supabase.table("liabilities")
        .delete()
        .eq("id", liability_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Liability not found")
