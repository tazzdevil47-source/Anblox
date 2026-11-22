# ANBLOX V23 — Extra multiplayer races

Added two optional race courses to the existing isolated multiplayer module:

- Classic 30m Sprint (unchanged).
- Sky Jump Race: 75m, many hurdles, 20 mandatory questions.
- Grand Running Race: 300m, endurance run, 20 mandatory questions.

The server is authoritative for track distances, question gates, penalties, and finish order. All courses remain in multiplayer-server/tracks.json. No adventure, parent report engine, world catalog, main question bank, or cosmetics were changed.

Deployment: copy the updated race/race.js and sw.js to the PWA repository; redeploy the multiplayer server with server.js and tracks.json. Online multiplayer still needs the server URL in race/race-config.js.
