ANBLOX V26 — Royal Style Studio crash fix

For an existing V25 GitHub deployment, replace ONLY:
  worlds.js
  sw.js

Cause: avatarSVG() used `identity` without defining it.
Fix: read the existing saved avatar profile inside avatarSVG().
The service worker cache key is updated so browsers fetch the repaired script.

Tested: Chromium isolated studio smoke test, all five cosmetic categories, all 12 type/skin-tone variations, no JavaScript page errors.
Also checked JavaScript syntax and ZIP integrity. Full iPhone Safari test pending.

No other game content, questions, maps, physics, or multiplayer code was altered.
Preserve the existing Vercel URL and avoid clearing Safari website data so local progress is retained.
