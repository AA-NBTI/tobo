import os
import glob
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.generator import generate_image_from_prompt
from core.seo_optimizer import save_webp_with_metadata
from config.settings import OUTPUT_DIR

app = FastAPI(
    title="Standalone Universal AI Image & SEO Engine",
    description="Zero-quota, high-performance local AI image generation and SEO metadata optimization microservice",
    version="1.0.0"
)

# Serve generated WebP images as static files
app.mount("/images", StaticFiles(directory=OUTPUT_DIR), name="images")

class ImageGenerateRequest(BaseModel):
    keyword: str
    category: Optional[str] = "general"
    prompt: Optional[str] = None
    steps: Optional[int] = 4

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "storage_dir": os.path.abspath(OUTPUT_DIR),
        "engine": "FLUX.1-schnell / SDXL-Lightning"
    }

@app.post("/api/v1/generate")
def generate_image_endpoint(req: ImageGenerateRequest):
    if not req.keyword or not req.keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword is required")

    effective_prompt = req.prompt or f"High quality photographic image of {req.keyword}, {req.category} style, 8k resolution"

    try:
        # 1. Generate image
        image = generate_image_from_prompt(effective_prompt, req.steps)

        # 2. Save WebP & generate SEO metadata
        metadata = save_webp_with_metadata(image, req.keyword, req.category)

        return {
            "success": True,
            "data": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/bank")
def get_image_bank():
    """F:\ 드라이브 이미지 뱅크에 사전 생성되어 있는 이미지 목록 반환 (0.01초 매칭용)"""
    json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))
    bank = []
    for jf in json_files:
        try:
            with open(jf, "r", encoding="utf-8") as f:
                bank.append(json.load(f))
        except Exception:
            pass
    return {"total": len(bank), "bank": bank}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
