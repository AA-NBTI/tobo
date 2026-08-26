import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

// ── 모델명 정규화 (옛날 DB 레코드나 이상한 모델명 들어왔을 때 자동 보정) ──────
function normalizeModelName(model?: string): string {
  if (!model || model === 'local' || model === 'default' || model === 'base-gemma') {
    return 'gemma-4-31b-it'
  }
  return model
}

// ── Gemma 모델 여부 판별 ──────────────────────────────────────
function isGemmaModel(model: string): boolean {
  return model.toLowerCase().includes('gemma')
}

// ── 동일 모델 최대 3회 반복 재시도 헬퍼 ────────────────────────
async function retrySameModel<T>(fn: () => Promise<T>, modelName: string, maxAttempts = 3): Promise<T> {
  let lastError: any = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      console.warn(`⚠️ [AI Core] (${modelName}) 호출 실패 (시도 ${attempt}/${maxAttempts}): ${err.message}`)
      if (attempt < maxAttempts) {
        // 백오프 대기 (1차 1초, 2차 2.5초)
        const waitMs = attempt * 1200 + Math.random() * 500
        await new Promise(res => setTimeout(res, waitMs))
      }
    }
  }
  throw lastError
}

// ── @ai-sdk/google 경로: Gemma 계열 전용 ────────────────────
async function generateWithAiSdkGoogle(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  try {
    const googleProvider = createGoogleGenerativeAI({ apiKey })
    console.log(`🚀 [AI Core / ai-sdk] Gemma 경로 (${modelId}) 호출 시도...`)
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
    console.warn(`⚠️ [AI Core / ai-sdk] Gemma (${modelId}) ai-sdk 실패 (${e.message}). 레거시 SDK로 전환합니다...`)
  }

  // ai-sdk 파싱 실패 또는 빈 텍스트 반환 시 레거시 SDK로 2차 직접 보정 시도
  return await generateWithLegacySdk(prompt, modelId)
}

// ── @google/generative-ai 경로: Gemini 계열 전용 ────────────
async function generateWithLegacySdk(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  const genAI = new GoogleGenerativeAI(apiKey)
  console.log(`🚀 [AI Core / legacy] Gemini 경로 (${modelId}) 호출 시도...`)
  const model = genAI.getGenerativeModel({ 
    model: modelId
  })
  
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(`[AI Core / legacy] Model ${modelId} generated empty text`)
  }
  console.log(`✅ [AI Core / legacy] (${modelId}) 생성 성공!`)
  return trimmed
}

// ── AI 결과물에서 생각 과정/메타데이터/찌꺼기 정제 ────────────────────
export function cleanAiThoughtOutput(rawText: string): string {
  if (!rawText) return ''
  let cleaned = rawText
    // 1. <think> ... </think> 태그 및 내부 사고과정 내용 제거
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // 2. ```markdown ... ``` 코드블록 마크다운 감싸기 제거
    .replace(/^```(?:markdown|html|json)?\n/gi, '')
    .replace(/\n```$/gi, '')
    // 3. 메타데이터 줄 단위 정제 (* Role, * Persona, * Goal, * Self-Correction 등)
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

// ── 공개 진입점 ────────────────────────────────────────────────
export async function generateEnforcedAIContent(
  prompt: string,
  preferredModel?: string
): Promise<string> {
  // 1. 모델명 정규화 (base-gemma, local 등 정식 명칭으로 보정)
  const primaryModel = normalizeModelName(preferredModel)
  let rawResult = ''

  // 2. Gemma 계열 모델일 경우
  if (isGemmaModel(primaryModel)) {
    try {
      // 1순위 동일 Gemma 모델로 최대 3회 재시도
      rawResult = await retrySameModel(
        () => generateWithAiSdkGoogle(prompt, primaryModel),
        primaryModel,
        3
      )
    } catch (err1) {
      console.warn(`⚠️ [AI Core] 1순위 Gemma (${primaryModel}) 3회 시도 모두 실패. Fallback(Gemini Lite) 진행...`, err1)
      try {
        // Gemma 3회 모두 실패 시 2순위 Gemini Lite로 3회 재시도
        rawResult = await retrySameModel(
          () => generateWithLegacySdk(prompt, 'gemini-3.1-flash-lite'),
          'gemini-3.1-flash-lite',
          3
        )
      } catch (err2) {
        console.error('🚨 [AI Core] Gemma 및 Fallback 모델 모두 3회 시도 실패!', err2)
        throw new Error('All AI generation retries failed.')
      }
    }
  } else {
    // 3. Gemini 계열 모델일 경우
    const fallbackModel = primaryModel === 'gemini-3.5-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite'

    try {
      // 1순위 동일 Gemini 모델로 최대 3회 재시도
      rawResult = await retrySameModel(
        () => generateWithLegacySdk(prompt, primaryModel),
        primaryModel,
        3
      )
    } catch (err1) {
      console.warn(`⚠️ [AI Core] 1순위 Gemini (${primaryModel}) 3회 시도 모두 실패. 2순위 (${fallbackModel}) 시도...`, err1)
      try {
        rawResult = await retrySameModel(
          () => generateWithLegacySdk(prompt, fallbackModel),
          fallbackModel,
          3
        )
      } catch (err2) {
        console.error('🚨 [AI Core] 모든 Gemini 모델 3회 시도 실패!', err2)
        throw new Error('All configured AI models failed after retries.')
      }
    }
  }

  return cleanAiThoughtOutput(rawResult)
}

// ── 오픈소스 로컬 트랜스포머 임베딩 (무제한 쿼터용) ──
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
    
    // 384 차원을 PostgreSQL vector(768) 규격에 맞게 768 차원으로 Zero-padding
    const padded = new Float32Array(768)
    padded.set(rawEmb)
    return Array.from(padded)
  } catch (err) {
    console.warn('⚠️ [Local ONNX Embedding] 백업 해시 임베딩 전환:', err)
    return generateFeatureHashingEmbedding(text)
  }
}

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

// ── 초고속 무제한 임베딩 생성 (1순위 오픈소스 로컬 ONNX 트랜스포머 -> 2순위 Google Gemini 백업) ──
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1순위: 초고속 무제한 오픈소스 로컬 ONNX 트랜스포머 임베딩 (10ms 소요, 0원 비용, 쿼터 제한 100% 해소)
  try {
    const localVec = await generateLocalONNXEmbedding(text)
    if (localVec && localVec.length === 768) {
      return localVec
    }
  } catch (eLocal) {
    console.warn('⚠️ [AI Core] 1순위 오픈소스 로컬 임베딩 연산 실패, 구글 Gemini 백업 시도:', eLocal)
  }

  // 2순위 (보조 백업): Google Generative AI API
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey)
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" })
      const res = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768
      } as any)
      return res.embedding.values
    } catch (e1: any) {
      console.warn(`⚠️ [AI Core] 구글 백업 임베딩 실패: ${e1.message}`)
    }
  }

  // 3순위 (최종 비상용 0-fail 백업): 로컬 Feature Vector Hashing
  return generateFeatureHashingEmbedding(text)
}

