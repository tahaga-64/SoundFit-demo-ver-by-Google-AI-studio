<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8e5c5227-04d6-4fd1-a4fb-37ac3b62ff4e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set keys in `.env.local`:
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY` (used only on server side proxy)
3. Run the app and API proxy together:
   `npm run dev`

The browser now calls `/api/anthropic/messages`, and the server injects `ANTHROPIC_API_KEY` so the key is never exposed to client-side code.
