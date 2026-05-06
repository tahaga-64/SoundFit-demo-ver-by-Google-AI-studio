/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from '@anthropic-ai/sdk';
import { type MusicProfile, type CompatibilityResult } from './types';

const MODEL = 'claude-haiku-4-5-20251001';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

async function ask(prompt: string): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function testAIConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await ask('「動作確認OK」とだけ日本語で返答してください。');
    return { ok: true, message: text.trim() || '応答あり（空レスポンス）' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function suggestSong(
  myProfile: MusicProfile,
  otherProfile: MusicProfile
): Promise<{ title: string; artist: string; reason: string }> {
  const prompt = `あなたは音楽の専門家です。
以下の2人の音楽の好みを分析し、2人が絶対に好きになる曲を1曲だけ提案してください。

ユーザー1 (${myProfile.name}):
- 好きなアーティスト: ${myProfile.favoriteArtists.join(', ')}
- ジャンル: ${myProfile.genres.join(', ')}

ユーザー2 (${otherProfile.name}):
- 好きなアーティスト: ${otherProfile.favoriteArtists.join(', ')}
- ジャンル: ${otherProfile.genres.join(', ')}

以下のJSON形式のみで回答してください（余計なテキストなし）:
{
  "title": "曲名",
  "artist": "アーティスト名",
  "reason": "この曲を選んだ理由（30文字以内）"
}`;

  const text = await ask(prompt);
  return JSON.parse(text) as { title: string; artist: string; reason: string };
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

  const text = await ask(prompt);
  return JSON.parse(text) as CompatibilityResult;
}
