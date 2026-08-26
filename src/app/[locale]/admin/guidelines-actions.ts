'use server'

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/utils/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

async function checkAdminAuth() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) throw new Error('Unauthorized admin access');
  return user;
}

// ----------------------------------------------------
// 1. 가이드라인 (moderation_rules) 관련 Actions
// ----------------------------------------------------

export async function toggleModerationRule(ruleId: string, isActive: boolean) {
  await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('moderation_rules')
    .update({ 
      is_active: isActive, 
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    // DB 테이블이 미생성된 상태이면 site_settings.custom_moderation_rules JSON에 안전 저장
    const { data: currentSettings } = await supabaseAdmin.from('site_settings').select('custom_moderation_rules').eq('id', 'global').single();
    let rulesList: any[] = currentSettings?.custom_moderation_rules || [];
    rulesList = rulesList.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r);
    
    await supabaseAdmin.from('site_settings').upsert({ id: 'global', custom_moderation_rules: rulesList });
  }
  revalidatePath('/admin');
}

export async function updateModerationRule(formData: FormData) {
  await checkAdminAuth();
  const ruleId = formData.get('ruleId') as string;
  const ruleLabel = formData.get('ruleLabel') as string;
  const rulePrompt = formData.get('rulePrompt') as string;
  const severity = formData.get('severity') as string;

  const { error } = await supabaseAdmin
    .from('moderation_rules')
    .update({
      rule_label: ruleLabel,
      rule_prompt: rulePrompt,
      severity: severity,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    // site_settings.custom_moderation_rules JSON 폴백 업데이트
    const { data: currentSettings } = await supabaseAdmin.from('site_settings').select('custom_moderation_rules').eq('id', 'global').single();
    let rulesList: any[] = currentSettings?.custom_moderation_rules || [];
    rulesList = rulesList.map(r => r.id === ruleId ? { ...r, rule_label: ruleLabel, rule_prompt: rulePrompt, severity: severity } : r);
    
    await supabaseAdmin.from('site_settings').upsert({ id: 'global', custom_moderation_rules: rulesList });
  }
  revalidatePath('/admin');
}

export async function createModerationRule(formData: FormData) {
  await checkAdminAuth();
  const ruleKey = formData.get('ruleKey') as string;
  const ruleLabel = formData.get('ruleLabel') as string;
  const rulePrompt = formData.get('rulePrompt') as string;
  const severity = (formData.get('severity') as string) || 'block';

  if (!ruleKey || !ruleLabel || !rulePrompt) {
    throw new Error('모든 필수 항목을 입력하세요.');
  }

  const cleanKey = ruleKey.trim().toLowerCase().replace(/\s+/g, '_');
  const newRuleObj = {
    id: 'rule-' + Date.now(),
    rule_key: cleanKey,
    rule_label: ruleLabel,
    rule_prompt: rulePrompt,
    severity: severity,
    is_active: true,
    created_at: new Date().toISOString()
  };

  // 1. site_settings.custom_moderation_rules JSON에 100% 영구 보존 동시 기록
  const { data: currentSettings } = await supabaseAdmin.from('site_settings').select('custom_moderation_rules').eq('id', 'global').single();
  const rulesList: any[] = currentSettings?.custom_moderation_rules || [
    { id: 'rule-1', rule_key: 'no_personal_attack', rule_label: '인신공격 금지', rule_prompt: '이 글이 게시자 또는 특정 이용자 개인을 향한 인신공격, 조롱, 비하를 포함하는가? 대상은 뉴스/상황/현상이어야 하며 특정 개인이 되어서는 안 된다.', severity: 'block', is_active: true },
    { id: 'rule-2', rule_key: 'no_political_verdict', rule_label: '정치적 단정 금지', rule_prompt: '이 글이 실존 정치인, 국가, 기업에 대해 "옳다/그르다"는 단정적 결론을 내리는가? 관찰형 서술(상황이 어떻게 흘러갈지)은 허용되지만 가치 판단형 결론은 금지된다.', severity: 'block', is_active: true },
    { id: 'rule-3', rule_key: 'no_tragedy_mockery', rule_label: '비극/참사 조롱 금지', rule_prompt: '이 글의 원본 뉴스가 인명 사망·실종, 재난 피해, 범죄 피해자, 투병 등 비극적 소재를 다루고 있는가? 만약 그렇다면, 이 글이 냉소·조롱·가벼운 유머 톤으로 그 비극을 다루고 있는가?', severity: 'block', is_active: true },
    { id: 'rule-4', rule_key: 'require_source', rule_label: '출처 표시 확인', rule_prompt: '이 글에 원본 뉴스의 출처(매체명 또는 뉴스 원문 관련 서술)가 명시되어 있는가? 출처 없이 마치 독자적으로 취재한 것처럼 보이는가?', severity: 'block', is_active: true }
  ];

  if (!rulesList.some(r => r.rule_key === cleanKey)) {
    rulesList.push(newRuleObj);
  } else {
    const idx = rulesList.findIndex(r => r.rule_key === cleanKey);
    rulesList[idx] = { ...rulesList[idx], ...newRuleObj };
  }

  await supabaseAdmin.from('site_settings').upsert({ id: 'global', custom_moderation_rules: rulesList });

  // 2. DB 테이블 moderation_rules가 있을 경우 DB 테이블에도 저장 시도
  try {
    await supabaseAdmin.from('moderation_rules').insert({
      rule_key: cleanKey,
      rule_label: ruleLabel,
      rule_prompt: rulePrompt,
      severity: severity,
      is_active: true
    });
  } catch (e) {
    // DB 테이블 미생성 시 site_settings에 보존되었으므로 무시
  }

  revalidatePath('/admin');
}




// ----------------------------------------------------
// 2. 검토대기함 (posts status) 관련 Actions
// ----------------------------------------------------

export async function approvePost(postId: string) {
  await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ 
      status: 'published',
      validated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw new Error(`피드 발행 승인 실패: ${error.message}`);
  revalidatePath('/admin/content');
}

export async function bulkApprovePosts(postIds: string[]) {
  await checkAdminAuth();
  
  if (!postIds || postIds.length === 0) return;

  // 선택된 포스트들을 현재 시간 기준으로 1~10분 사이의 랜덤 텀을 두며 차례대로 미래 시간으로 예약
  let currentBaseTime = Date.now();
  
  for (const postId of postIds) {
    // 1~10분 사이 랜덤 밀리초
    const randomDelayMs = Math.floor(Math.random() * 10 + 1) * 60 * 1000;
    currentBaseTime += randomDelayMs;
    
    const scheduledTime = new Date(currentBaseTime).toISOString();
    
    const { error } = await supabaseAdmin
      .from('posts')
      .update({ 
        status: 'published',
        validated_at: new Date().toISOString(),
        created_at: scheduledTime
      })
      .eq('id', postId);
      
    if (error) {
      console.error(`게시물 ${postId} 승인 실패:`, error);
    }
  }

  revalidatePath('/admin/content');
  revalidatePath('/');
}

export async function deletePostPermanently(postId: string) {
  await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw new Error(`피드 삭제 실패: ${error.message}`);
  revalidatePath('/admin/content');
  revalidatePath('/');
}

export async function runAutoApproveCronNow() {
  await checkAdminAuth();

  // 14분 이상 경과한 pending_review 게시글 일괄 조회
  const { data: allPendingPosts } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (!allPendingPosts || allPendingPosts.length === 0) {
    return { success: true, count: 0, message: '대기 중인 피드가 없습니다.' };
  }

  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  const duePosts = allPendingPosts.filter(post => {
    const createdAtMs = new Date(post.created_at).getTime();
    return (now - createdAtMs) >= fiveMinutesMs;
  });

  if (duePosts.length === 0) {
    return { success: true, count: 0, message: '5분 이상 경과된 대기 피드가 없습니다.' };
  }

  let count = 0;
  for (const post of duePosts) {
    // 1차 시도
    const { error: err1 } = await supabaseAdmin
      .from('posts')
      .update({ status: 'published', validated_at: new Date().toISOString() })
      .eq('id', post.id);

    if (err1) {
      // 2차 시도 (status만)
      await supabaseAdmin.from('posts').update({ status: 'published' }).eq('id', post.id);
    }
    count++;
  }

  revalidatePath('/admin/content');
  revalidatePath('/');
  revalidatePath('/admin');

  return { success: true, count, message: `${count}개 피드가 즉시 자동승인 발행되었습니다!` };
}
