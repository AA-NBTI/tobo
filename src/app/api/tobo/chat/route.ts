import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { executeToboResponse } from '@/modules/tobo/engine/tobo-execution-engine';
import { selectBestCard, prepareLeadMaterial } from '@/modules/tobo/engine/lead-material-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { message, history = [], step = 1, isCardClick = false, clickedSlotData = {} } = body;

    // 1. Zero-Turn Onboarding (초기 진입)
    if (message === '__INIT__') {
      const { cardType } = selectBestCard(new Set(), null, 0, false, null);
      const card = cardType ? prepareLeadMaterial(cardType, null) : undefined;
      return NextResponse.json({
        success: true,
        reply: "안녕하세요! 원하시는 서비스를 가볍게 선택해 주세요.",
        card: card,
        step: 1,
        isUnmet: false
      });
    }

    // 2. Progressive Click Funnel (버튼 클릭 시 LLM 우회)
    if (isCardClick) {
      const filledSlots = new Set<string>(Object.keys(clickedSlotData).filter(k => clickedSlotData[k]));
      const category = clickedSlotData.category === 'UNSUPPORTED' ? 'UNSUPPORTED' : clickedSlotData.category;
      
      const { cardType, action } = selectBestCard(filledSlots, null, 0, false, category);
      const card = (action === "SHOW_CARD" && cardType) ? prepareLeadMaterial(cardType, category) : undefined;
      
      return NextResponse.json({
        success: true,
        reply: null, // 텍스트 없이 카드만 즉각 교체
        card: card,
        step: step + 1,
        isUnmet: category === 'UNSUPPORTED'
      });
    }

    // 3. 기존 주관식 대화 (LLM 파이프라인)
    const result = await executeToboResponse(
      supabase,
      message,
      history,
      step,
      user?.id
    );

    return NextResponse.json({
      success: true,
      reply: result.reply,
      card: result.card,
      step: result.step,
      isUnmet: result.isUnmet,
      unmetCategory: result.unmetCategory,
      recommendationList: result.recommendationList
    });
  } catch (error: any) {
    console.error('Tobo Chat API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
