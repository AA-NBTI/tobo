import Parser from 'rss-parser';

const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  }
});

// 시스템 분야 카테고리를 Google News RSS Topic 코드 매핑
const GOOGLE_NEWS_TOPICS: Record<string, string> = {
  politics: 'POLITICS',          // 정치
  economy: 'BUSINESS',           // 경제
  society: 'NATION',             // 사회/국내
  tech: 'TECHNOLOGY',            // IT/기술
  world: 'WORLD',                // 세계
  entertainment: 'ENTERTAINMENT',// 연예
  sports: 'SPORTS',              // 스포츠
  culture: 'SCIENCE',            // 생활/문화/과학
  opinion: 'MAIN',               // 오피니언 (메인 헤드라인)
};

export async function fetchRandomNews(existingUrls: string[] = [], locale: string = 'ko', category: string = 'all') {
  try {
    let rssUrl = '';
    const topicCode = GOOGLE_NEWS_TOPICS[category] || 'MAIN';

    if (locale === 'ko') {
      if (topicCode === 'MAIN') {
        rssUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
      } else {
        rssUrl = `https://news.google.com/rss/headlines/section/topic/${topicCode}?hl=ko&gl=KR&ceid=KR:ko`;
      }
    } else {
      const enDomains = [
        { gl: 'US', ceid: 'US:en' },
        { gl: 'GB', ceid: 'GB:en' },
        { gl: 'CA', ceid: 'CA:en' },
        { gl: 'AU', ceid: 'AU:en' }
      ];
      const selected = enDomains[Math.floor(Math.random() * enDomains.length)];

      if (topicCode === 'MAIN') {
        rssUrl = `https://news.google.com/rss?hl=en-${selected.gl}&gl=${selected.gl}&ceid=${selected.ceid}`;
      } else {
        rssUrl = `https://news.google.com/rss/headlines/section/topic/${topicCode}?hl=en-${selected.gl}&gl=${selected.gl}&ceid=${selected.ceid}`;
      }
    }

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (err) {
      console.warn(`[NewsFetcher] ${category} (${topicCode}) 전용 RSS 수집 실패, 기본 메인 RSS로 우회합니다.`);
      const fallbackUrl = locale === 'ko' 
        ? 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'
        : 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      feed = await parser.parseURL(fallbackUrl);
    }
    
    if (!feed.items || feed.items.length === 0) {
      throw new Error('No news items found');
    }

    // 이미 사용된 URL 제외
    const freshItems = feed.items.filter(item => item.link && !existingUrls.includes(item.link));

    if (freshItems.length === 0) {
      throw new Error('No fresh news items found (all duplicates).');
    }

    // 상위 15개 최신 기사 중 무작위 1개 추출
    const topItems = freshItems.slice(0, 15);
    const randomItem = topItems[Math.floor(Math.random() * topItems.length)];

    const title = randomItem.title || '';
    const contentSnippet = randomItem.contentSnippet || randomItem.content || '';

    // 뉴스 민감도 사전 태깅 (LLM 호출)
    const { sensitivityTag, sensitivityReason } = await tagNewsSensitivity(title, contentSnippet);

    return {
      title,
      link: randomItem.link || '',
      contentSnippet,
      sensitivityTag,
      sensitivityReason
    };
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return null;
  }
}

/**
 * 뉴스 기사가 인명 사망·실종, 재난 피해, 범죄 피해자, 투병 등 비극적/민감한 소재인지 판단하는 LLM 태깅 함수
 */
export async function tagNewsSensitivity(title: string, snippet: string): Promise<{ sensitivityTag: 'normal' | 'sensitive'; sensitivityReason?: string }> {
  try {
    const { generateEnforcedAIContent } = await import('./ai-core');
    const prompt = `당신은 뉴스 콘텐츠의 민감도를 빠르게 분류하는 팩트 판별 AI입니다.

[분석 대상 뉴스]
기사 제목: ${title}
기사 요약: ${snippet}

[판단 기준]
이 뉴스가 인명 사망/실종/중상, 재난 피해, 범죄 피해자, 심각한 투병/질병, 자살/참사 중 하나라도 다루고 있다면 "sensitive"입니다. 그렇지 않고 일반 정치, 경제, IT, 문화, 일상 사건 등이라면 "normal"입니다.

[반환 형식]
반드시 아래 JSON 형식으로만 출력하세요:
{
  "tag": "sensitive" 또는 "normal",
  "reason": "한 줄 사유 요약 (sensitive일 경우 사유 작성)"
}`;

    const raw = await generateEnforcedAIContent(prompt, 'gemma-4-26b-a4b-it');
    if (!raw) return { sensitivityTag: 'normal' };

    let cleaned = raw;
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');

    const parsed = JSON.parse(cleaned);
    const tag = parsed.tag === 'sensitive' ? 'sensitive' : 'normal';
    return {
      sensitivityTag: tag,
      sensitivityReason: parsed.reason || undefined
    };
  } catch (e) {
    console.warn('[tagNewsSensitivity] LLM 태깅 실패, 기본값 normal 적용:', e);
    return { sensitivityTag: 'normal' };
  }
}
