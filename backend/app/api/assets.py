from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.schemas.assets import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter()


@router.get("", response_model=list[AssetResponse])
async def list_assets(user_id: str = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("assets").select("*").eq("user_id", user_id).execute()
    return result.data


@router.post("", response_model=AssetResponse, status_code=201)
async def create_asset(
    body: AssetCreate,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    data = body.model_dump()
    data["user_id"] = user_id
    result = supabase.table("assets").insert(data).execute()
    return result.data[0]


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    body: AssetUpdate,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = (
        supabase.table("assets")
        .update(update_data)
        .eq("id", asset_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Asset not found")
    return result.data[0]


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: str,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase_client()
    result = (
        supabase.table("assets")
        .delete()
        .eq("id", asset_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Asset not found")
