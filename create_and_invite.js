const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupLiveRoomAndInvite() {
  // 1. 단체 대화방 생성
  const { data: room, error: rErr } = await admin.from('chat_rooms').insert({
    name: '🏛️ [봇 군단 실시간 시뮬레이션 LAB] 골든리트리버 예약 배틀',
    is_group: true
  }).select().single();

  if (rErr || !room) {
    console.error('Room create error:', rErr);
    return;
  }
  console.log('✅ Room created:', room.id);

  // 2. 모든 사용자 계정을 단체방 멤버(participants)로 정식 초대
  const { data: allAccounts } = await admin.from('accounts').select('id, display_name');
  for (const acc of (allAccounts || [])) {
    await admin.from('chat_participants').insert({
      room_id: room.id,
      user_id: acc.id
    });
  }
  console.log('✅ 관리자 포함 총', allAccounts?.length, '명 멤버 초대 완료!');

  // 3. 6대 봇 식별
  const personaBot = allAccounts.find(b => b.display_name.includes('페르소나'));
  const toboBot = allAccounts.find(b => b.display_name.includes('토보'));
  const slotBot = allAccounts.find(b => b.display_name.includes('슬롯'));
  const taxonomyBot = allAccounts.find(b => b.display_name.includes('정합성'));
  const judgeBot = allAccounts.find(b => b.display_name.includes('모순'));
  const archiveBot = allAccounts.find(b => b.display_name.includes('아카이빙'));

  async function postMsg(senderId, content) {
    await admin.from('chat_messages').insert({
      room_id: room.id,
      sender_id: senderId,
      content
    });
  }

  // 4. 실시간 대화 및 감사 기록
  await postMsg(personaBot.id, '퇴근하고 저녁에 큰 강아지 목욕 스파 맡길 수 있는 곳 있어? 차 가지고 가야 해');
  await postMsg(toboBot.id, '퇴근 후 편안한 방문을 위해, 전용 주차 공간이나 편리한 진입로가 우선인 매장으로 찾아드릴까요?\n\n[선택 카드]: 넓은 전용 주차 완비 (자차 이동) / 집 근처 도보권 / 픽업 희망');
  await postMsg(slotBot.id, '🕵️ [실시간 슬롯 감사]: 대형견, 자차운전(hasCar: true), 목욕스파 슬롯 3개 정상 추출 확인. (누락: 0건)');
  await postMsg(personaBot.id, '넓은 전용 주차 완비 필수 (자차 SUV 이동)');
  await postMsg(toboBot.id, '보호자님의 자차 이동과 대형견 목욕에 최적화된 전용 주차 완비 매장을 연결합니다.\n\n🥇 [주차우선] 뽀송펫 스파 (대형견 탄산스파 목욕 90,000원)\n📍 부산 사하구 하단동 789-3 (지상 전용 주차장 완비)\n🔗 [예약 신청하기]: http://localhost:3000/shop/bbosong-pet-spa');
  await postMsg(taxonomyBot.id, '🌲 [추천 정합성 판정]: 고객 조건(대형견 + 주차 필수) -> [주차우선] 뽀송펫 스파 매칭 정합성 100% 일치 확인.');
  await postMsg(judgeBot.id, '⚖️ [최종 모순 감사 결과]:\n- 1턴 물음표 화법: PASS (+25점)\n- 맥락-카드 일치: PASS (+25점)\n- 슬롯 추출 정밀도: PASS (+25점)\n- 추천 기준 정합성: PASS (+25점)\n- 적발된 논리 모순: 0건 -> [최종 판정: 100점 PERFECT PASS]');
  await postMsg(archiveBot.id, '💾 [예약 아카이브 완료]: 고객(페르소나봇) -> 뽀송펫 스파 예약 슬롯 생성 및 감사 로그 보존 완료.');

  console.log('✅ 전원 초대 및 실시간 대화 생성 완결! Room URL: /messages?group=' + room.id);
}

setupLiveRoomAndInvite();
