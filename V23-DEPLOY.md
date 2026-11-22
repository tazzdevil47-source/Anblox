# Anblox V23 — Multiplayer Race Modes

## Racing modes
- 30 Meter Sprint (Rainbow Run, Island Dash): 30m, 20 mandatory questions.
- Sky Jump Race: 75m, 16 hurdles, 20 mandatory questions.
- Grand Running Race: 300m, 12 spaced hurdles, 20 mandatory questions.

All races use the existing 2–4-player private room / cross-platform WebSocket connection. Before all players press READY, the room host chooses the race course. Existing 20-demo-question pack is shared across the three modes and can be replaced by the parent using the existing editor.

## Updating an existing V22 PWA on GitHub
Replace only:
- `anblox-pwa/race/race.js`
- `anblox-pwa/sw.js`

## Updating the existing standalone multiplayer server
Redeploy with:
- `multiplayer-server/server.js`
- `multiplayer-server/tracks.json`
- `multiplayer-server/test/race.test.js` (optional but recommended)

For a first deployment, use the **complete V23 package**, host `anblox-pwa/` as the site and `multiplayer-server/` as a separate Node WebSocket web service. In `anblox-pwa/race/race-config.js`, provide the deployed HTTPS server URL. Keep credentials (ADMIN_KEY) on the server. Existing server still requires a live host and origin settings; no phone-to-phone live connection has been verified here.

## Modularity
The adventure engine, adventure map registry, saved progress, cosmetics, question-bank.js, and parent dashboard are unchanged. New race tracks are configured in `multiplayer-server/tracks.json` with their own `length` and `obstacles` array. A standalone multiplayer server enforces travel distance, 20 question gates, penalties and finishing order. Any iOS Safari/Android live race needs a deployed server and physical-phone testing.
