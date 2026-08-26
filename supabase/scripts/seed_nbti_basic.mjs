import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

const questions = [
  { question_id: 'GEN_EI_01', test_type: 'basic', axis: 'EI', polarity:  1, content: '사람들과 어울리면 에너지가 생긴다' },
  { question_id: 'GEN_EI_02', test_type: 'basic', axis: 'EI', polarity: -1, content: '혼자 있어야 에너지가 충전된다' },
  { question_id: 'GEN_EI_03', test_type: 'basic', axis: 'EI', polarity:  1, content: '새로운 사람과 금방 친해진다' },
  { question_id: 'GEN_EI_04', test_type: 'basic', axis: 'EI', polarity: -1, content: '여럿이 놀고 나면 혼자 쉬어야 한다' },
  { question_id: 'GEN_EI_05', test_type: 'basic', axis: 'EI', polarity:  1, content: '말하면서 생각이 정리된다' },
  { question_id: 'GEN_EI_06', test_type: 'basic', axis: 'EI', polarity: -1, content: '말하기 전에 머릿속으로 먼저 정리한다' },
  { question_id: 'GEN_EI_07', test_type: 'basic', axis: 'EI', polarity:  1, content: '갑작스러운 모임도 즐겁게 참석한다' },

  { question_id: 'GEN_SN_01', test_type: 'basic', axis: 'SN', polarity: -1, content: '새로운 가능성을 상상하는 게 즐겁다' },
  { question_id: 'GEN_SN_02', test_type: 'basic', axis: 'SN', polarity:  1, content: '경험과 사실을 바탕으로 판단한다' },
  { question_id: 'GEN_SN_03', test_type: 'basic', axis: 'SN', polarity: -1, content: '사물 이면의 의미와 패턴에 관심이 간다' },
  { question_id: 'GEN_SN_04', test_type: 'basic', axis: 'SN', polarity:  1, content: '세부 지침이 있어야 일하기 편하다' },
  { question_id: 'GEN_SN_05', test_type: 'basic', axis: 'SN', polarity: -1, content: '비유적 표현을 자주 사용한다' },
  { question_id: 'GEN_SN_06', test_type: 'basic', axis: 'SN', polarity:  1, content: '지금 할 수 있는 것에 집중하는 편이다' },
  { question_id: 'GEN_SN_07', test_type: 'basic', axis: 'SN', polarity: -1, content: '직감이 자주 맞는 편이다' },

  { question_id: 'GEN_TF_01', test_type: 'basic', axis: 'TF', polarity:  1, content: '원칙을 위해 불편한 말도 할 수 있다' },
  { question_id: 'GEN_TF_02', test_type: 'basic', axis: 'TF', polarity: -1, content: '결정이 남의 감정에 미칠 영향이 신경 쓰인다' },
  { question_id: 'GEN_TF_03', test_type: 'basic', axis: 'TF', polarity:  1, content: '고민을 들으면 해결책을 찾게 된다' },
  { question_id: 'GEN_TF_04', test_type: 'basic', axis: 'TF', polarity: -1, content: '친구가 힘들면 공감부터 하는 편이다' },
  { question_id: 'GEN_TF_05', test_type: 'basic', axis: 'TF', polarity:  1, content: '팩트 기반 피드백을 선호한다' },
  { question_id: 'GEN_TF_06', test_type: 'basic', axis: 'TF', polarity: -1, content: '상대가 화나면 옳은 말도 나중에 한다' },
  { question_id: 'GEN_TF_07', test_type: 'basic', axis: 'TF', polarity:  1, content: '감정을 배제하고 객관적으로 판단하려 한다' },

  { question_id: 'GEN_JP_01', test_type: 'basic', axis: 'JP', polarity:  1, content: '일정을 미리 짜두어야 마음이 편하다' },
  { question_id: 'GEN_JP_02', test_type: 'basic', axis: 'JP', polarity: -1, content: '그날 기분에 맞춰 유연하게 움직인다' },
  { question_id: 'GEN_JP_03', test_type: 'basic', axis: 'JP', polarity:  1, content: '할 일 목록을 만들고 지워나가는 게 좋다' },
  { question_id: 'GEN_JP_04', test_type: 'basic', axis: 'JP', polarity: -1, content: '마감이 임박해야 집중이 잘 되는 편이다' },
  { question_id: 'GEN_JP_05', test_type: 'basic', axis: 'JP', polarity:  1, content: '정해진 체계대로 정리되어 있어야 한다' },
  { question_id: 'GEN_JP_06', test_type: 'basic', axis: 'JP', polarity: -1, content: '결정을 미루고 여지를 남겨두는 편이다' },
  { question_id: 'GEN_JP_07', test_type: 'basic', axis: 'JP', polarity:  1, content: '계획이 틀어지면 스트레스를 받는다' },
]

const { error } = await sb.from('nbti_questions').upsert(questions)
if (error) {
  console.error('❌ nbti_questions 시드 오류:', error.message)
} else {
  console.log(`✅ nbti_questions 일반형(basic) 28개 문항 시드 이식 완료!`)
}
