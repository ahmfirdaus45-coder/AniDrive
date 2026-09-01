# AniDrive Dropbox Proxy

Frontend: `frontend/index.html`
Backend: `backend/server.js`

## Setup
1. Copy `.env.example` to `.env`.
2. Put the Dropbox access token in `.env`.
3. Run `cd backend && npm install && npm start`.
4. Open `http://localhost:3000`.

The proxy supports HTTP Range requests so the video player can seek without exposing the Dropbox credential to the browser.
