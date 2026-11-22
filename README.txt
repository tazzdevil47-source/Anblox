ANBLOX V10 — FREE-ROAM ADVENTURE (PWA)

Opening: PLAY -> enter a nickname -> select one of six worlds -> choose an unlocked level -> LET’S GO. Nickname stays on device and appears at top. Tap nickname to change and reselect.

Free exploration: movement on broad grounds; open-front rooms, an arcade, angel garden, treasure house, fashion boutique, discovery park and danger woods. NPC walkers, visible running animation, obstacles and missions.

Learning is contextual: the angel asks permission; arcade math is optional; treasure has a puzzle; the danger zone contains a fast chase question; the existing rescue quiz logic and parent reporting remain.

Progress: world progress is saved to the same localStorage key as V9; extra unlocked-level list kept separately. Existing saves are preserved on the same browser origin, unless site data is cleared. No server accounts.

Controls: WASD/arrows to move, Shift to run, Space to jump, E to interact. Mobile: joystick, JUMP and context-sensitive interaction button.

Deploy: replace index.html, game.js, worlds.js and sw.js in the existing Vercel-connected GitHub repository. Keep remaining files unchanged.

NOTE: This is a free-roam prototype using custom Canvas 3D projection, not a commercial 3D engine. Full physics and mobile gameplay testing remain necessary.

V11 — CHARACTER & QUESTION PACK:
Opening lets the player choose a boy or girl avatar and one of six skin tones, as well as nickname/world/level. Choice is saved locally in its own profile key. Both avatar types can earn the same wardrobe rewards. The 3D avatar is still a simple box-based model.

For future education updates: EDIT OR REPLACE ONLY question-bank.js. It contains the fixed geography, Bangladesh history, world history, science questions, and the math question generator. Keep window.ANBLOX_QUESTION_BANK and the row format [question,correct,wrong1,wrong2,wrong3]. Do not touch quiz.js. The existing content.js is a separate custom-pack legacy mechanism; it is not needed for core content updates. Deploy question-bank.js in GitHub and commit; the service worker uses network-first fetching, so reload to receive it (offline devices use the cached copy until they reconnect). Previous question history is retained locally, capped at the prior 2,000 records.

All shipped subject questions are in question-bank.js, including Nature migrated from the old starter content.js. AnbloxContent remains for existing locally stored parent-editor additions; no need to edit content.js for future releases.

ANBLOX V12 additions:
- Visit Pet Meadow west of the safe plaza to adopt Mochi the kitten or Biscuit the puppy; Spark the dragon unlocks after two correct treasure pattern puzzles. One active pet follows at a time.
- Walk near an NPC and tap TALK (or E) to invite them to follow. One active NPC friend at a time.
- Treasure House now offers an optional untimed visual-pattern puzzle OR a knowledge question. Visual puzzle attempts are recorded in the existing parent answer log.
- Companion progress is stored under anblox-companions-v1, independently from levels and question-bank.js.
- Future question bank updates should still replace question-bank.js only.

V13 CURRICULUM: Built-in questions are organized Subject → Topic → Questions in question-bank.js. Select the subject in the quiz menu, then the topic. Future content-only releases require replacing question-bank.js only (keep subject/topic IDs stable). Parent reports include subtopics when present. Old question rows preserved.

V14 RELIABILITY UPDATE:
- Three different discoveries per level (park, treasure, NPC friend, pet meadow, optional angel, arcade). Repeated completion of the same activity within a level does not grant extra progress. Level 5 still requires the existing four graduation exams.
- The question-bank editor now requires the same parental password as the report. This client-side password deters casual access; it is not server-grade security.
- The player uses separate upper/lower limb and hand/foot voxel blocks with movement-driven strides. This remains custom Canvas 3D projection, not skeletal animation or a full physics engine.
- Family report includes accuracy by subject and topic plus approximate active-time breakdown (gameplay, quizzes, wardrobe, menus, idle); historical time cannot be divided retroactively.
- The question-bank.js file is intentionally unchanged. Previous local save keys are preserved.

ANBLOX V15 — AUDIT FIXES (November 2026)
- Highest unlocked level is separate from the currently replayed level. Returning to Level 1 preserves the previous highest level and parent-report milestone.
- Monster navigation inside Danger Woods uses obstacle-aware grid waypoints and wall collision, rather than walking straight through walls. This is local waypoint routing, not general-purpose NPC AI.
- Player arms, forearms, hands, thighs, shins and feet use joint-linked, rotated block segments for a more convincing run/jump; full skeletal animation remains a future upgrade.
- Active movement input (including held keyboard keys and joystick movement) counts as play. Idle thresholds: 45 seconds of inactive gameplay or 60 seconds of inactive menus. Background-tab time is excluded. Pre-V15 activity totals are not retroactively reclassified.
- Angel and monster answers keep the subject and available topic metadata for parental review.
- question-bank.js is unchanged; all learning content updates still use that one file.

V16 fixes (Nov 2026):
- Level selection displays all unlocked levels with pages of eight and a direct level field; no Level 30 limit.
- During the 30-second lava/water escape, enemies are disabled and cannot interrupt.
- Removed unused duplicate rescue dialog/timer from worlds.js. The active rescue rule is one question (8-second answer window in current implementation) and 30 seconds to escape, with no second quiz.
- Turning now rotates the avatar torso/head; steps have alternating stance/swing phase and foot lift. Canvas animation remains approximate, not skeletal animation.
- Activity tracking continues as estimated active time, not a measurement of attention.
- question-bank.js is unchanged.

V19: 30 Meter Sprint ships with 20 mixed-subject DEMO questions on the separate server. Adventure quiz paths and question-bank.js remain independent and unchanged. See DEPLOY-README.md.
