import { GoogleGenAI, Type } from '@google/genai'
import { z } from 'zod'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

export const AtsAnalysis = z.object({
  original_score: z.number().int().min(0).max(100),
  optimized_score: z.number().int().min(0).max(100),
  summary: z.string(),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  bullet_rewrites: z.array(
    z.object({ before: z.string(), after: z.string(), reason: z.string() }),
  ),
  suggestions: z.array(z.string()),
})
export type AtsAnalysis = z.infer<typeof AtsAnalysis>

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    original_score: { type: Type.INTEGER },
    optimized_score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    matched_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    missing_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    bullet_rewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          before: { type: Type.STRING },
          after: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['before', 'after', 'reason'],
      },
    },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'original_score', 'optimized_score', 'summary',
    'matched_keywords', 'missing_keywords', 'bullet_rewrites', 'suggestions',
  ],
}

const SYSTEM_PROMPT = `You are an expert technical recruiter and ATS specialist.
Given a candidate's CV and a target job description, you score ATS match (0-100),
estimate an optimized_score, list matched and missing keywords, rewrite weak bullet
points with strong active verbs and quantified impact, and give concrete suggestions.
NEVER invent experience the candidate does not have — improve wording only. If a number
is unknown, use a placeholder like "[X]%". Be specific to THIS job.`

export async function optimizeCv(cvText: string, jobDescription: string) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `# Candidate CV\n${cvText}\n\n# Target job description\n${jobDescription}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  const raw = response.text
  if (!raw) throw new Error('The model returned no analysis.')
  const analysis = AtsAnalysis.parse(JSON.parse(raw))

  return { analysis, model: MODEL, tokens: response.usageMetadata?.totalTokenCount ?? null }
}