# Pip — GroqCloud Online Mind

This project pairs Pip's existing 3D creature simulation with an optional server-side GroqCloud chat connection.

## Keep the API key private

Set `GROQ_API_KEY` only in your server's environment settings. Never put it in browser JavaScript or commit it to GitHub. The key shared in chat should be revoked and replaced.

## Deploy with Render

1. Create a Web Service from this repository.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add `GROQ_API_KEY` in Render → Environment, using a newly generated key.
5. Deploy, then open the service URL.

The server exposes `/api/pip/health` and `/api/pip/chat`; the browser app and API should be served from the same origin.

## Local run

Requires Node.js 20+. Set `GROQ_API_KEY` in your shell, run `npm start`, then open `http://localhost:3000`.

The AI connection gives Pip LLM-generated responses; it does not demonstrate actual consciousness. Browser-side memories remain in that browser unless explicitly sent as part of a prompt.