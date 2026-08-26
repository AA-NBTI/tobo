import os
import re
import json
import time
from PIL import Image
from config.settings import OUTPUT_DIR, WEBP_QUALITY

def slugify(text: str) -> str:
    """텍스트를 SEO 친화적인 영문/한글/숫자 slug 스펙으로 변환 (Google/Naver SEO 규격)"""
    text = text.lower().strip()
    # 특수문자만 제거하고 한글/영문/숫자/하이픈 유지
    text = re.sub(r'[^\w\s\u3131-\u318E\uAC00-\uD7A3-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    clean_slug = text.strip('-')
    return clean_slug if len(clean_slug) > 0 else 'ai-seo-photo'

def generate_clean_alt_text(keyword: str, category: str = "general") -> str:
    """
    특정 봇 이름이나 브랜드명 없이, 검색 로봇 및 시각 장애인을 위한
    순수 키워드 중심의 자연스럽고 완벽한 100% 범용 ALT 대체 텍스트 생성
    """
    clean = keyword.strip()
    
    category_templates = {
        "food": f"{clean} 레시피 및 맛있는 트렌드 조명 고화질 이미지",
        "tech": f"최신 IT 기술 및 {clean} 동향을 나타내는 시각 자료",
        "cafe": f"분위기 좋은 카페에서 즐기는 {clean} 유용한 정보",
        "lifestyle": f"일상 속에서 접하는 {clean} 트렌디한 이미지",
        "news": f"이슈 브리핑: {clean} 관련 핵심 정리 이미지",
        "general": f"{clean}에 관한 상세 정보 및 유용한 이미지"
    }

    return category_templates.get(category.lower(), category_templates["general"])

def save_webp_with_metadata(image: Image.Image, keyword: str, category: str = "general") -> dict:
    """
    1. 이미지를 WebP (quality=85) 최적화 변환하여 저장
    2. SEO 전용 유의미한 파일명 부여
    3. 메타데이터 (.json) 세트 동시 저장
    """
    timestamp = int(time.time())
    base_slug = slugify(keyword)
    filename = f"{base_slug}-{timestamp}.webp"
    file_path = os.path.join(OUTPUT_DIR, filename)

    # 1. WebP 저장
    image.save(file_path, "WEBP", quality=WEBP_QUALITY, optimize=True)

    # 2. 범용 ALT 태그 및 메타데이터 생성
    alt_text = generate_clean_alt_text(keyword, category)

    metadata = {
        "filename": filename,
        "file_path": os.path.abspath(file_path),
        "format": "webp",
        "quality": WEBP_QUALITY,
        "width": image.width,
        "height": image.height,
        "keyword": keyword,
        "category": category,
        "seo": {
            "alt_text": alt_text,
            "title": f"{keyword} - 핵심 이미지",
            "slug": base_slug
        },
        "created_at": timestamp
    }

    json_path = file_path.replace(".webp", ".json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return metadata
