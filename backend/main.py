import os
import shutil
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Form
from fastapi.responses import FileResponse
from externalMergeSort import ExternalMergeSort
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from router import router as file_router
import struct

app = FastAPI()

UPLOAD_DIR = 'temp_uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs('temp', exist_ok=True)

current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(current_dir), "frontend")

def cleanup_files(file_paths: list):
    for path in file_paths:
        if os.path.exists(path):
            os.remove(path)
            
@app.post('/sort-binary-file/')
async def sort_binary_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_size: int = 10000
):
    input_file_path = os.path.join(UPLOAD_DIR, f"input_{file.filename}")
    output_filename = f"sorted_{file.filename}"
    output_file_path = os.path.join(UPLOAD_DIR, output_filename)
    
    try:
        with open(input_file_path, 'wb') as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        sorter = ExternalMergeSort()
        sorter.splitFiles(input_file_path, chunk_size)
        sorter.merge_recursive(output_file_path)
        
        if not os.path.exists(output_file_path):
            raise HTTPException(status_code=500, detail="Lỗi: File không được tạo ra!")
        
        background_tasks.add_task(cleanup_files, [input_file_path, output_file_path])
        
        return FileResponse(
            path = output_file_path, 
            filename=output_filename,
            media_type='application/octet-stream'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(input_file_path):
            os.remove(input_file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(file_router, prefix='/api', tags=["Generate Dummy Data"])

app.mount('/static', StaticFiles(directory=frontend_dir), name='static')

@app.get('/')
def read_root():
    return FileResponse(os.path.join(frontend_dir, 'index.html'))

@app.post('/api/visualize-sort')
async def visualize_sort_api(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_size: int = Form(10) 
):
    input_file_path = os.path.join(UPLOAD_DIR, f"vis_input_{file.filename}")
    output_file_path = os.path.join(UPLOAD_DIR, f"vis_output_{file.filename}")
    
    try:
        with open(input_file_path, 'wb') as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        sorter = ExternalMergeSort()
        sorter.splitFiles(input_file_path, chunk_size) 
        sorter.merge_recursive(output_file_path)
        
        background_tasks.add_task(cleanup_files, [input_file_path, output_file_path])
        
        return {
            "status": "success",
            "message": "Đã trích xuất lịch sử xử lý file.",
            "chunk_size_used": chunk_size, 
            "history": sorter.history
        }

    except Exception as e:
        if os.path.exists(input_file_path):
            os.remove(input_file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi mô phỏng: {str(e)}")