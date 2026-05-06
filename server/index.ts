import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: '1mb' }));

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');
    client = new Anthropic({ apiKey });
  }
  return client;
}

app.post('/api/anthropic/messages', async (req, res) => {
  try {
    const { prompt, model = 'claude-haiku-4-5-20251001', max_tokens = 512 } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt は必須です' });
      return;
    }

    const msg = await getClient().messages.create({
      model,
      max_tokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const first = msg.content[0];
    const text = first?.type === 'text' ? first.text : '';
    res.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Anthropic proxy server listening on http://localhost:${port}`);
});
