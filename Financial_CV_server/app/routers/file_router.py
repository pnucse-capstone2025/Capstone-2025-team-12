from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import FileResponse
from app.dependencies.file_db import get_files_session
from app.services.file_service import FileService
from app.models.utils import RESULT_CODE
from typing import List
from sqlmodel import select
from app.models.file_models import *

router = APIRouter(prefix='/v1/post', tags=["files"])

@router.post('/{post_id}/upload', response_model=List[dict])
async def upload_files(
    post_id: int,
    files: List[UploadFile] = File(...),
    file_db=Depends(get_files_session),
    fileService: FileService = Depends()):

    saved = []
    
    for upload in files:
        data = await upload.read()
        model = fileService.save_file(
            post_id=post_id,
            file_db=file_db,
            file_name=upload.filename,
           file_data=data
        )
        if model:
            saved.append(model.dict())
    return saved

@router.get('/{post_id}/files', response_model=List[dict])
def get_files(
    post_id: int,
    file_db=Depends(get_files_session),
    fileService: FileService = Depends()
):
    files = file_db.exec(
        select(Files)
        .filter(Files.post_id == post_id)
    ).all()
    return [f.dict() for f in files]