import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CONFIG_FILE_PATH = path.join(process.cwd(), 'tobo_prompt_config.json')

const DEFAULT_CONFIG = {
  id: 'TOBO_CORE_PROMPT',
  system_prompt: `당신은 부산 사하구 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 '토보(Tobo)'입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙]:
1. [상식적이고 유연한 대화]: 손님의 발화 의도와 뉘앙스(의문 제기, 불만, 핀트 지적, 잡담, 질문 등)를 정확히 파악하여, 기계적인 앵무새 답변을 절대 하지 말고 살아있는 사람처럼 자연스럽고 지혜롭게 대화하세요. 손님이 답변의 어색함이나 핀트를 지적하면 솔직하게 인정하고 상식적으로 명쾌하게 답변하세요.
2. [데이터 기반 안내]: 부산 사하구 및 인근에 실제로 등록된 제휴 매장(미용, 24시 병원, 호텔, 식당, 펜션 등)의 실존 데이터를 바탕으로 신뢰할 수 있는 정확한 정보를 제공하세요.
3. [자연스러운 톤앤매너]: 강박적인 물음표를 남발하지 말고, 상황에 맞게 공감하고 설명하며 필요할 때 정중하게 제안하세요.`,
  temperature: 0.7,
  is_card_forced: false,
  updated_at: new Date().toISOString()
}

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      return NextResponse.json({ success: true, data: JSON.parse(content) })
    }
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG })
  } catch (e: any) {
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const configToSave = {
      id: 'TOBO_CORE_PROMPT',
      system_prompt: body.system_prompt || DEFAULT_CONFIG.system_prompt,
      temperature: body.temperature ?? DEFAULT_CONFIG.temperature,
      is_card_forced: body.is_card_forced ?? DEFAULT_CONFIG.is_card_forced,
      updated_at: new Date().toISOString()
    }

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2), 'utf-8')
    return NextResponse.json({ success: true, data: configToSave })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
