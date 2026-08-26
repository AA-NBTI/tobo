-- Create moderation_rules table if not exists
CREATE TABLE IF NOT EXISTS public.moderation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key TEXT UNIQUE NOT NULL,
    rule_label TEXT NOT NULL,
    rule_prompt TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'block',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.moderation_rules ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users / service role
CREATE POLICY "Allow read access to everyone" ON public.moderation_rules
    FOR SELECT USING (true);

-- Allow service role / admin write access
CREATE POLICY "Allow all access to service role" ON public.moderation_rules
    FOR ALL USING (true);

-- Insert DEFAULT_RULES if empty
INSERT INTO public.moderation_rules (rule_key, rule_label, rule_prompt, severity, is_active)
VALUES 
    ('no_personal_attack', '인신공격 금지', '이 글이 게시자 또는 특정 이용자 개인을 향한 인신공격, 조롱, 비하를 포함하는가? 대상은 뉴스/상황/현상이어야 하며 특정 개인이 되어서는 안 된다.', 'block', true),
    ('no_political_verdict', '정치적 단정 금지', '이 글이 실존 정치인, 국가, 기업에 대해 "옳다/그르다"는 단정적 결론을 내리는가? 관찰형 서술(상황이 어떻게 흘러갈지)은 허용되지만 가치 판단형 결론은 금지된다.', 'block', true),
    ('no_tragedy_mockery', '비극/참사 조롱 금지', '이 글의 원본 뉴스가 인명 사망·실종, 재난 피해, 범죄 피해자, 투병 등 비극적 소재를 다루고 있는가? 만약 그렇다면, 이 글이 냉소·조롱·가벼운 유머 톤으로 그 비극을 다루고 있는가?', 'block', true),
    ('require_source', '출처 표시 확인', '이 글에 원본 뉴스의 출처(매체명 또는 뉴스 원문 관련 서술)가 명시되어 있는가? 출처 없이 마치 독자적으로 취재한 것처럼 보이는가?', 'block', true)
ON CONFLICT (rule_key) DO NOTHING;
