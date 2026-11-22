# ANBLOX V25 — ground, camera clipping, sky jump courses

## Fixes
- The player's physical feet cannot descend below ground level. Water/lava rescue still asks one question, then allows 30 seconds to escape, but no longer visually sinks the avatar below a flat floor.
- World surfaces close to the camera now use near-plane polygon clipping instead of disappearing when one polygon corner gets close to the lens.
- Collisions account for obstacle height (so jumping above a wall works); tree trunks and towers are also solid while at their vertical levels.
- Every adventure map provides a climbable 16-step sky platform course plus summit at x ~ -46 to +12, z=63, reaching over 17 world units high. Platforms have real landing height and support the character. The sky course is a shared gameplay feature, independently configurable by map with `skyCourse` in `world-catalog.js`.
- Starts rescue without processing enemy collision in the same update frame.
- Bumps PWA cache version.

## Existing V24 repository: replace ONLY
1. game.js
2. world-catalog.js
3. sw.js

Do not replace question-bank.js or files in race/; no progress keys changed.

## Do not bulk-delete just to update
Uploading replacement files to their existing paths is safer. If you do need to remove a folder, GitHub's web UI supports visiting the folder then its ellipsis menu -> Delete directory -> Commit changes (if available to your account). For bulk editing arbitrary files, use GitHub Desktop to clone your repository, delete files locally in File Explorer, review deletions, then Commit to main and Push origin. Back up the repository first. Never delete .git in the local clone, and avoid deleting index.html, sw.js, race/ or question-bank.js inadvertently.

## Test on an actual iPhone
1. After Vercel redeploy, reload Safari and open the existing home screen PWA with a working connection. Cached service workers may require closing and reopening.
2. Test camera left/right in a room; avatar should remain visible from different view angles.
3. Test sky course in every world, heading to x=-46 z=63 (follow left/west past the village toward the far side of Discovery Park). Jump across the colored staircase to the sky summit.
4. On Lava Island and Maldives, entering the hazard surface should ask a rescue question but not bury the avatar underground.
5. Confirm existing progress and learning history remain intact.

## Validation limitation
Syntax, static invariants, package integrity and existing server unit tests were run. Chromium local-page testing was blocked or timed out in this environment. This release is not certified by testing on a physical iPhone.
