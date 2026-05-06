import { GoogleGenAI } from '@google/genai'
import type { MusicProfile } from './types'

const apiKey = ((import.meta as unknown) as { env: { VITE_GEMINI_API_KEY: string } }).env.VITE_GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey })

export interface CompatibilityResult {
    score: number      // 0〜100
    insight: string    // 日本語の相性コメント（60字以内）
    reasons: string[]  // 共通点リスト（最大3つ）
}

export async function analyzeCompatibility(
    myProfile: Pick<MusicProfile, 'genres' | 'favoriteArtists'>,
    theirProfile: Pick<MusicProfile, 'name' | 'genres' | 'favoriteArtists'>
): Promise<CompatibilityResult> {
    const prompt = `
あなたは音楽の相性を分析するAIです。
以下の2人の音楽プロフィールを比較して、相性スコアと分析コメントをJSON形式で返してください。

【自分のプロフィール】
好きなジャンル: ${myProfile.genres.join(', ')}
好きなアーティスト: ${myProfile.favoriteArtists.join(', ')}

【相手のプロフィール（${theirProfile.name}）】
好きなジャンル: ${theirProfile.genres.join(', ')}
好きなアーティスト: ${theirProfile.favoriteArtists.join(', ')}

以下のJSON形式のみで返答してください。説明は不要です:
{
    "score": 0から100の整数,
    "insight": "二人の音楽的相性を説明する日本語の文章（60字以内）",
    "reasons": ["共通点1", "共通点2", "共通点3（最大3つ）"]
}
`

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
        },
    })

    const text = response.text ?? '{}'
    const result = JSON.parse(text)

    return {
        score: Math.min(100, Math.max(0, Number(result.score) || 50)),
        insight: result.insight || '音楽の趣味が近いかも？',
        reasons: Array.isArray(result.reasons) ? result.reasons.slice(0, 3) : [],
    }
}
