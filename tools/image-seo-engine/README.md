# 🚀 Standalone Universal AI Image & SEO Engine

특정 웹 서비스나 브랜드명에 전혀 종속되지 않는 **독립형 무제한 AI 이미지 생성 및 SEO 메타데이터 최적화 마이크로서비스**입니다.

---

## 🌟 핵심 특징

1. **100% 서비스 비종속 (Domain-Agnostic)**
   - 특정 봇 이름이나 도메인 표현을 하드코딩하지 않습니다.
   - 키워드와 카테고리를 기반으로 **구글/네이버 검색 엔진 노출에 최적화된 순수 키워드 중심 ALT 태그**를 자동 발급합니다.
2. **WebP 자동 최적화 & F:\ 드라이브 용량 보관**
   - PNG/JPG 대비 70% 용량이 적은 `WebP (quality=85)` 규격으로 자동 압축 및 변환합니다.
   - 모델 파일 및 이미지 뱅크를 `F:\` 드라이브에 보관하여 C:\ 드라이브 용량 압박을 방지합니다.
3. **2가지 동작 모드 지원**
   - **실시간 온디맨드 연산 모드**: `POST /api/v1/generate` (1~2초 소요)
   - **사전 뱅크 매칭 모드 (0.01초)**: `GET /api/v1/bank` (미리 F:\ 드라이브에 생성해 둔 자산에서 즉시 0초에 인출)

---

## 🛠️ 실행 방법

### 1. 패키지 설치
```bash
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
python api/server.py
```
* 기본 서버 주소: `http://localhost:8000`
* API 문서(Swagger UI): `http://localhost:8000/docs`

---

## 🔌 API 연동 규격

### 1. 헬스 체크
* **URL**: `GET /health`
* **응답**:
```json
{
  "status": "online",
  "storage_dir": "F:\\ai_image_bank",
  "engine": "FLUX.1-schnell / SDXL-Lightning"
}
```

### 2. 이미지 생성 & SEO 태그 발급
* **URL**: `POST /api/v1/generate`
* **Payload**:
```json
{
  "keyword": "민트초코 라테",
  "category": "food",
  "prompt": "High quality photograph of iced mint chocolate latte on wooden table"
}
```
* **Response**:
```json
{
  "success": true,
  "data": {
    "filename": "mint-chocolate-latte-1787289000.webp",
    "file_path": "F:\\ai_image_bank\\mint-chocolate-latte-1787289000.webp",
    "format": "webp",
    "quality": 85,
    "width": 1024,
    "height": 1024,
    "seo": {
      "alt_text": "민트초코 라테 레시피 및 맛있는 트렌드 조명 고화질 이미지",
      "title": "민트초코 라테 - 핵심 이미지",
      "slug": "mint-chocolate-latte"
    }
  }
}
```

### 3. 사전 뱅크 인출 (0.01초 매칭)
* **URL**: `GET /api/v1/bank`
* **Response**: `F:\ai_image_bank`에 미리 쌓여있는 이미지 메타데이터 리스트 반환
