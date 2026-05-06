/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { type MusicProfile, type CompatibilityResult } from './types';

let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function testGeminiConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: '「動作確認OK」とだけ日本語で返答してください。',
    });
    const text = response.text?.trim() ?? '';
    return { ok: true, message: text || '応答あり（空レスポンス）' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function analyzeCompatibility(
  myProfile: MusicProfile,
  otherProfile: MusicProfile
): Promise<CompatibilityResult> {
  const prompt = `あなたは音楽の相性を分析するAIアシスタントです。
以下の2人の音楽プロフィールを分析し、相性を日本語で回答してください。

ユーザー1 (${myProfile.name}):
- 好きなアーティスト: ${myProfile.favoriteArtists.join(', ')}
- ジャンル: ${myProfile.genres.join(', ')}

ユーザー2 (${otherProfile.name}):
- 好きなアーティスト: ${otherProfile.favoriteArtists.join(', ')}
- ジャンル: ${otherProfile.genres.join(', ')}

以下のJSON形式のみで回答してください（余計なテキストなし）:
{
  "score": 相性スコア(0から100の整数),
  "insight": "相性についての一言コメント（30文字以内）",
  "reasons": ["共通点や相性の理由1", "共通点や相性の理由2"]
}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;
  return JSON.parse(text) as CompatibilityResult;
}
