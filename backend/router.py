from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import asyncio
from createTestFile import generate_file

router = APIRouter()

class FileGenerateRequest(BaseModel):
    file_name: str = 'test_data.bin'
    total_numbers: int = 2500000
    range_limit: int = 2000000000

def cleanup_generated_file(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)
    
@router.post('/generate-test-file')
async def create_test_file_endpoint(request: FileGenerateRequest, background_tasks: BackgroundTasks):
    """
    Tạo file binary chứa các số nguyên ngẫu nhiên để test
    """
    save_dir = "./data"
    os.makedirs(save_dir, exist_ok=True)
    
    file_path = os.path.join(save_dir, request.file_name)
    
    try:
        await asyncio.to_thread(
            generate_file,
            file_path,
            request.total_numbers,
            request.range_limit
        )
        background_tasks.add_task(cleanup_generated_file, file_path)
        
        return FileResponse(
            path=file_path,
            filename=request.file_name,
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo file: {str(e)}")