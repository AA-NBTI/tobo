import { generateEmbedding as generateCoreEmbedding } from './ai-core'

export const EMBEDDING_DIMENSIONS = 768

export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, 2500)
  return await generateCoreEmbedding(truncated)
}

/**
 * 두 벡터 간 코사인 유사도를 계산합니다. (0~1, 높을수록 유사)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * 봇 목록 중 주어진 텍스트와 가장 의미적으로 유사한 봇을 반환합니다.
 * persona_embedding이 없는 봇은 후보에서 제외됩니다.
 */
export function findMostSimilarBot(
  bots: any[],
  targetEmbedding: number[]
): { bot: any; similarity: number } | null {
  let best: { bot: any; similarity: number } | null = null

  for (const bot of bots) {
    if (!bot.persona_embedding) continue

    // DB에서 오는 벡터는 문자열 "[0.1,0.2,...]" 또는 number[] 형태일 수 있음
    const vec: number[] =
      typeof bot.persona_embedding === 'string'
        ? JSON.parse(bot.persona_embedding)
        : bot.persona_embedding

    const sim = cosineSimilarity(targetEmbedding, vec)
    if (!best || sim > best.similarity) {
      best = { bot, similarity: sim }
    }
  }

  return best
}
