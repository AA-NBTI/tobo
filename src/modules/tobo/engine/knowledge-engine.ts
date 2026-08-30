import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 📚 [Core 2] 지식 축적 계층 (Knowledge DB Engine)
 * - `learned_mappings` DB 테이블을 실제로 조회(SELECT) 및 자동 적재(UPSERT)
 */

export interface DbKnowledgeMapping {
  id?: string;
  raw_expression: string;
  normalized_value: string;
  field_id: string;
  domain_category: string;
  confidence: number;
  usage_count?: number;
}

// 1. DB에서 학습된 지식 맵 조회 (SELECT)
export async function getLearnedMappingsFromDb(
  supabase: SupabaseClient,
  domainCategory = 'universal'
): Promise<DbKnowledgeMapping[]> {
  try {
    const { data, error } = await supabase
      .from('learned_mappings')
      .select('id, raw_expression, normalized_value, field_id, domain_category, confidence, usage_count')
      .or(`domain_category.eq.${domainCategory},domain_category.eq.universal`)
      .order('usage_count', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('getLearnedMappingsFromDb error:', e);
    return [];
  }
}

// 2. 새로운 자연어 표현 발견 시 DB에 자동 학습 적재 (UPSERT)
export async function upsertLearnedKnowledge(
  supabase: SupabaseClient,
  rawExpression: string,
  normalizedValue: string,
  fieldId: string,
  domainCategory = 'universal',
  confidence = 0.95
): Promise<boolean> {
  try {
    const cleanedRaw = rawExpression.trim().toLowerCase();
    if (!cleanedRaw) return false;

    // 기존 매핑 존재 여부 확인
    const { data: existing } = await supabase
      .from('learned_mappings')
      .select('id, usage_count')
      .eq('raw_expression', cleanedRaw)
      .eq('field_id', fieldId)
      .single();

    if (existing) {
      await supabase
        .from('learned_mappings')
        .update({
          usage_count: (existing.usage_count || 1) + 1,
          normalized_value: normalizedValue,
          confidence: Math.max(confidence, 0.90)
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('learned_mappings').insert({
        raw_expression: cleanedRaw,
        normalized_value: normalizedValue,
        field_id: fieldId,
        domain_category: domainCategory,
        confidence: confidence,
        usage_count: 1
      });
    }
    return true;
  } catch (e) {
    console.error('upsertLearnedKnowledge error:', e);
    return false;
  }
}

// 3. 실시간 대화 발화에서 DB 지식 룩업 및 고속 슬롯 추출
export async function lookupKnowledgeWithDb(
  supabase: SupabaseClient,
  message: string,
  domainCategory = 'universal'
): Promise<{ extractedSlots: Record<string, any>; avgConfidence: number }> {
  const dbMappings = await getLearnedMappingsFromDb(supabase, domainCategory);
  const lower = (message || '').toLowerCase();
  const extractedSlots: Record<string, any> = {};
  let totalConf = 0;
  let matchCount = 0;

  for (const item of dbMappings) {
    if (lower.includes(item.raw_expression.toLowerCase())) {
      extractedSlots[item.field_id] = item.normalized_value;
      totalConf += Number(item.confidence);
      matchCount++;
    }
  }

  const avgConfidence = matchCount > 0 ? Math.round((totalConf / matchCount) * 100) / 100 : 0.0;
  return { extractedSlots, avgConfidence };
}
