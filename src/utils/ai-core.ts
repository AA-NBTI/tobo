import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

// 1. 모델명 정규화 (기본 Gemma 4 / Gemma 31b-it 계열 보정)
function normalizeModelName(model?: string): string {
  if (!model || model === 'local' || model === 'default' || model === 'base-gemma') {
    return 'gemma-4-31b-it'
  }
  return model
}

// 2. Gemma 모델 여부 판단
function isGemmaModel(model: string): boolean {
  return model.toLowerCase().includes('gemma')
}

// 3. 동일 모델 3회 재시도 헬퍼
async function retrySameModel<T>(fn: () => Promise<T>, modelName: string, maxAttempts = 3): Promise<T> {
  let lastError: any = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      console.warn(`⚠️ [AI Core] (${modelName}) 호출 실패 (시도 ${attempt}/${maxAttempts}): ${err.message}`)
      if (attempt < maxAttempts) {
        const waitMs = attempt * 1200 + Math.random() * 500
        await new Promise(res => setTimeout(res, waitMs))
      }
    }
  }
  throw lastError
}

// 4. @ai-sdk/google 경로: Gemma 계열 호출
async function generateWithAiSdkGoogle(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  try {
    const googleProvider = createGoogleGenerativeAI({ apiKey })
    console.log(`🤖 [AI Core / ai-sdk] Gemma 경로 (${modelId}) 호출 시도...`)
    const { text } = await generateText({
      model: googleProvider(modelId),
      prompt,
      maxRetries: 0,
    })
    const trimmed = text.trim()
    if (trimmed) {
      console.log(`✅ [AI Core / ai-sdk] (${modelId}) 생성 성공!`)
      return trimmed
    }
  } catch (e: any) {
    console.warn(`⚠️ [AI Core / ai-sdk] Gemma (${modelId}) ai-sdk 실패 (${e.message}). 레거시 SDK 전환...`)
  }

  return await generateWithLegacySdk(prompt, modelId)
}

// 5. @google/generative-ai 레거시 SDK 경로: Gemini Fallback 호출
async function generateWithLegacySdk(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  const genAI = new GoogleGenerativeAI(apiKey)
  console.log(`⚡ [AI Core / legacy] Gemini 경로 (${modelId}) 호출 시도...`)
  const model = genAI.getGenerativeModel({ model: modelId })
  
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(`[AI Core / legacy] Model ${modelId} generated empty text`)
  }
  console.log(`✅ [AI Core / legacy] (${modelId}) 생성 성공!`)
  return trimmed
}

// 6. AI 생각 과정 및 메타데이터 정제 유틸
export function cleanAiThoughtOutput(rawText: string): string {
  if (!rawText) return ''
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:markdown|html|json)?\n/gi, '')
    .replace(/\n```$/gi, '')
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (/^[\*\-]\s*(?:Role|Persona|Goal|Constraint|Line|Input|Language|Core|Self-Correction|Final|Draft|Idea|Task)/i.test(trimmed)) return false
      if (/^(?:Role|Persona|Goal|Constraint|Line|Input|Language|Core|Self-Correction|Final|Thinking Process|Exactly|No greetings)/i.test(trimmed)) return false
      return true
    })
    .join('\n')

  return cleaned.trim()
}

// 7. 메인 AI 텍스트 생성 엔트리포인트 (Gemma 1순위 -> 3회 재시도 -> Gemini Lite Fallback)
export async function generateEnforcedAIContent(
  prompt: string,
  preferredModel?: string
): Promise<string> {
  const primaryModel = normalizeModelName(preferredModel)
  let rawResult = ''

  if (isGemmaModel(primaryModel)) {
    try {
      rawResult = await retrySameModel(
        () => generateWithAiSdkGoogle(prompt, primaryModel),
        primaryModel,
        3
      )
    } catch (err1) {
      console.warn(`⚠️ [AI Core] 1순위 Gemma (${primaryModel}) 3회 실패. Fallback(Gemini Lite) 진행...`, err1)
      try {
        rawResult = await retrySameModel(
          () => generateWithLegacySdk(prompt, 'gemini-2.5-flash'),
          'gemini-2.5-flash',
          3
        )
      } catch (err2) {
        console.error('❌ [AI Core] Gemma 및 Fallback 모델 모두 3회 시도 실패!', err2)
        throw new Error('All AI generation retries failed.')
      }
    }
  } else {
    const fallbackModel = primaryModel === 'gemini-2.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.5-flash'

    try {
      rawResult = await retrySameModel(
        () => generateWithLegacySdk(prompt, primaryModel),
        primaryModel,
        3
      )
    } catch (err1) {
      console.warn(`⚠️ [AI Core] 1순위 Gemini (${primaryModel}) 3회 실패. 2순위 (${fallbackModel}) 시도...`, err1)
      try {
        rawResult = await retrySameModel(
          () => generateWithLegacySdk(prompt, fallbackModel),
          fallbackModel,
          3
        )
      } catch (err2) {
        console.error('❌ [AI Core] 모든 Gemini 모델 3회 시도 실패!', err2)
        throw new Error('All configured AI models failed after retries.')
      }
    }
  }

  return cleanAiThoughtOutput(rawResult)
}

// 8. ONNX 오픈소스 로컬 트랜스포머 Vector Embedding (384d -> Zero padded to 768d for PostgreSQL pgvector)
let localPipelinePromise: Promise<any> | null = null

async function getLocalExtractor() {
  if (!localPipelinePromise) {
    const { pipeline } = await import('@xenova/transformers')
    localPipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return localPipelinePromise
}

async function generateLocalONNXEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getLocalExtractor()
    const res = await extractor(text, { pooling: 'mean', normalize: true })
    const rawEmb = Array.from(res.data) as number[]
    
    const padded = new Float32Array(768)
    padded.set(rawEmb)
    return Array.from(padded)
  } catch (err) {
    console.warn('⚠️ [Local ONNX Embedding] 백업 해시 임베딩 전환:', err)
    return generateFeatureHashingEmbedding(text)
  }
}

// 9. Feature Hashing Vector (Zero-fail 백업 768d 임베딩)
function generateFeatureHashingEmbedding(text: string): number[] {
  const DIM = 768
  const vec = new Float64Array(DIM)
  const clean = text.toLowerCase().trim()
  const tokens: string[] = clean.split(/\s+/)

  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i <= clean.length - n; i++) {
      tokens.push(clean.substring(i, i + n))
    }
  }

  for (const token of tokens) {
    let hash = 2166136261
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    const idx = Math.abs(hash) % DIM
    const sign = (hash & 1) === 0 ? 1 : -1
    vec[idx] += sign * (1 + token.length * 0.1)
  }

  let norm = 0
  for (let i = 0; i < DIM; i++) {
    norm += vec[i] * vec[i]
  }
  norm = Math.sqrt(norm) || 1

  const result = new Array(DIM)
  for (let i = 0; i < DIM; i++) {
    result[i] = vec[i] / norm
  }
  return result
}

// 10. 무제한 다계층 Vector Embedding 생성 함수
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const localVec = await generateLocalONNXEmbedding(text)
    if (localVec && localVec.length === 768) {
      return localVec
    }
  } catch (eLocal) {
    console.warn('⚠️ [AI Core] 1순위 오픈소스 로컬 임베딩 연산 실패, Google Gemini 백업 시도:', eLocal)
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey)
    try {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
      const res = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768
      } as any)
      return res.embedding.values
    } catch (e1: any) {
      console.warn(`⚠️ [AI Core] 구글 백업 임베딩 실패: ${e1.message}`)
    }
  }

  return generateFeatureHashingEmbedding(text)
}
