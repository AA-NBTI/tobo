import { NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json()
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    const prompt = `당신은 대한민국 최고의 SEO 마케팅 및 블로그 기획 전문가입니다.
사용자가 입력한 타겟 키워드: "${keyword}"

이 키워드를 바탕으로, 검색 트래픽을 장악할 수 있는 강력한 블로그 포스팅 제목과 그에 맞는 전략적 키워드 세트 5개를 제안해주세요.
각 제안마다 다음 요소들을 반드시 포함해야 합니다:
1. title: 클릭을 유도하는 매력적인(어그로/후킹) 블로그 제목
2. coreKeyword: 검색량이 최상위인 메인 타겟 키워드
3. mediumKeyword: 중간 검색량을 가지며 본문을 풍부하게 할 연관 키워드
4. blueOceanKeyword: 검색량 대비 경쟁이 적어 틈새 노출을 노릴 수 있는 블루오션 키워드
5. score: 이 제목과 키워드 조합의 종합 SEO 예측 점수 (0~100 사이의 숫자)

결과는 반드시 아래 JSON 형식으로만 응답하세요 (다른 설명은 일절 포함하지 마세요):
{
  "titles": [
    {
      "title": "제목1",
      "coreKeyword": "핵심키워드1",
      "mediumKeyword": "중간키워드1",
      "blueOceanKeyword": "블루오션키워드1",
      "score": 95
    }
    // ... 총 5개
  ]
}
`
    const responseText = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it')
    
    // Extract JSON block if surrounded by markdown
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || responseText.match(/{[\s\S]*}/)
    let jsonResult = { titles: [] }
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        jsonResult = JSON.parse(jsonStr)
      } catch (e) {
        console.error('Failed to parse AI suggestion JSON:', e, responseText)
      }
    } else {
      try {
        jsonResult = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse AI suggestion JSON (raw):', e, responseText)
      }
    }

    return NextResponse.json(jsonResult)
  } catch (error: any) {
    console.error('Error in ai-blog-suggest API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
