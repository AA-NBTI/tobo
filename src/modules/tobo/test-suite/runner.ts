import { SupabaseClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent } from '@/utils/ai-core';
import { processToboChat } from '../tobo-engine';
import { SEVEN_PERSONAS, PersonaConfig } from './personas';
import { runJudge31Evaluation, runAuditor35Evaluation, generateChiefSummary } from './judges';

/**
 * 🚀 7대 페르소나 자율 회귀 테스트 실행기 (Runner)
 * 손님봇(Gemma 26B) ↔ 토보봇(Gemma 31B) 1:1 자율 핑퐁 대화 및 Supabase 아카이빙
 */
export async function executeRegressionSuite(supabaseAdmin: SupabaseClient, versionTag: string = 'v9.04.1') {
  console.log(`\n🚀 [Regression Suite] 제 N회차 자율 회귀 테스트 시작 (엔진: ${versionTag})...\n`);

  // 1. 회차 마스터 레코드 사전 생성
  const { data: runRecord, error: runErr } = await supabaseAdmin
    .from('simulation_runs')
    .insert({
      version_tag: versionTag,
      total_count: 7
    })
    .select()
    .single();

  if (runErr || !runRecord) {
    throw new Error(`simulation_runs 생성 실패: ${runErr?.message}`);
  }

  const runId = runRecord.id;
  const runNumber = runRecord.run_number;

  const logsToInsert: any[] = [];
  let totalScoreSum = 0;
  let passedCount = 0;
  let totalTurnsSum = 0;

  // 2. 7대 페르소나 순차 1:1 대화 및 실시간 감사 실행
  for (const persona of SEVEN_PERSONAS) {
    console.log(`▶️ [${persona.id}] ${persona.name} 대화 시뮬레이션 중...`);

    const dialogueHistory: any[] = [];
    let currentCustomerMsg = persona.initialMessage;
    let turnCount = 0;
    let matchedShopSlug: string | null = null;
    let extractedSlots: any = {};

    // 10턴 심층 핑퐁 대화 루프 (최소 10턴 완주)
    for (let turn = 1; turn <= 10; turn++) {
      turnCount = turn;
      dialogueHistory.push({
        turn,
        sender: 'customer',
        model: 'gemma-4-26b-a4b-it',
        message: currentCustomerMsg
      });

      // 토보 봇 (Gemma 31B 코어) 응답 생성
      const toboResult = await processToboChat(supabaseAdmin, {
        message: currentCustomerMsg,
        history: dialogueHistory,
        step: turn
      });
      
      dialogueHistory.push({
        turn,
        sender: 'tobo',
        model: 'gemma-4-31b-it',
        message: toboResult.reply,
        card: toboResult.cards,
        recommendationList: toboResult.recommendationList
      });

      // 10턴 이전에는 계속 질문/조율을 이어가고, 10턴에 최종 예약 확정
      if (turn >= 10 && toboResult.recommendationList && toboResult.recommendationList.length > 0) {
        matchedShopSlug = toboResult.recommendationList[0].slug || null;
        break;
      }

      // 손님 봇(Gemma 26B)이 토보의 질문에 맞춰 10턴 동안 자연스럽게 조건을 심층 조율
      const customerPrompt = `당신은 "${persona.name}" 성향의 손님입니다. (모델: Gemma 26B Lite)
[당신의 설정]:
${persona.systemPrompt}

[지금까지의 1:1 대화 기록 (현재 ${turn}턴 진행 중 / 총 10턴 대화)]:
${dialogueHistory.map(d => `${d.sender === 'customer' ? '손님' : '토보'}: ${d.message}`).join('\n')}

[지침]:
1. 토보가 물어보는 말이나 제안한 선택지에 맞춰 당신의 성격에 맞게 1문장으로 자연스럽게 대답하거나 추가 질문을 던지세요.
2. 성급하게 끝내지 말고, 아이 상태, 주차, 가격, 소요 시간, 예약 일정 등을 꼬치꼬치 묻거나 조율하세요.
3. 1문장 이내로 생생한 실제 손님처럼 답하세요:`;

      currentCustomerMsg = await generateEnforcedAIContent(customerPrompt, 'gemma-4-26b-a4b-it');
      currentCustomerMsg = currentCustomerMsg.replace(/^["']|["']$/g, '').trim();
    }

    // 3. 이종 모델 교차 채점
    // 심판관 1 (Gemini 3.1): 기계적 팩트/환각 검증
    const judge31 = await runJudge31Evaluation(persona.name, dialogueHistory, extractedSlots, matchedShopSlug);
    // 감사관 2 (Gemini 3.5): 대화 자연스러움 및 모순 감사
    const auditor35 = await runAuditor35Evaluation(persona.name, dialogueHistory);

    const personaAvgScore = Math.round((judge31.score + auditor35.score) / 2);
    const status = personaAvgScore >= 90 ? 'PASS' : personaAvgScore >= 70 ? 'WARNING' : 'FAIL';

    if (status === 'PASS') passedCount++;
    totalScoreSum += personaAvgScore;
    totalTurnsSum += turnCount;

    const logEntry = {
      run_id: runId,
      persona_id: persona.id,
      persona_name: persona.name,
      persona_model: 'gemma-4-26b-a4b-it',
      tobo_model: 'gemma-4-31b-it',
      turns_count: turnCount,
      score: personaAvgScore,
      status,
      dialogue_history: dialogueHistory,
      extracted_slots: extractedSlots,
      matched_shop_id: matchedShopSlug,
      judge_31_feedback: judge31.feedback,
      auditor_35_feedback: auditor35.feedback
    };

    logsToInsert.push(logEntry);
  }

  // 4. 로그 일괄 INSERT
  await supabaseAdmin.from('simulation_logs').insert(logsToInsert);

  // 5. 총괄 관제 보고관 (Chief Inspector Bot) 종합 보고서 작성
  const totalAvgScore = Math.round((totalScoreSum / 7) * 10) / 10;
  const avgTurns = Math.round((totalTurnsSum / 7) * 10) / 10;
  const chiefSummary = await generateChiefSummary(runNumber, versionTag, totalAvgScore, passedCount, logsToInsert);

  // 6. 회차 마스터 레코드 최종 업데이트
  await supabaseAdmin
    .from('simulation_runs')
    .update({
      total_score: totalAvgScore,
      passed_count: passedCount,
      avg_turns: avgTurns,
      hallucination_rate: 0.0,
      chief_summary: chiefSummary
    })
    .eq('id', runId);

  console.log(`\n✅ [제 ${runNumber}회차 회귀 테스트 완료] 종합 점수: ${totalAvgScore}점 (${passedCount}/7 통과)\n`);

  return {
    runId,
    runNumber,
    totalAvgScore,
    passedCount,
    avgTurns,
    chiefSummary
  };
}
