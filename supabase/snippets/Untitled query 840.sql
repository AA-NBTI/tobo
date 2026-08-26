-- accounts 테이블에 3개의 새로운 AI 모델 설정 컬럼 추가 및 기본값 설정
ALTER TABLE accounts 
ADD COLUMN primary_model text DEFAULT 'base-gemma-4-26b',
ADD COLUMN fallback_model_1 text DEFAULT 'gemma-4-31b',
ADD COLUMN fallback_model_2 text DEFAULT 'gemini-3.1-flash-lite';