ANBLOX V3 — World Adventures
============================
Open this folder on a static web host with HTTPS for reliable PWA installation. Do not open index.html directly on iPhone; service workers do not run from file://.

GAMEPLAY
• 6 selectable worlds: Theme Park, Lava Island, Angel Island, Maldives, Tiny House, Halloween.
• Third-person, locally rendered block-platform runner with jumping, moving simulated NPC runners, faster angry enemy chases, and bonus angel challenges.
• Angry enemy contact: 4-second question; correct freezes pursuer for 10 seconds; otherwise lose a life and respawn further back.
• Angels: rapid-fire 20-second questions. Super Fast Math: separate 20-question timed quiz.
• Lava/water: falling off a platform triggers a first-aid/swim rescue question and repeated 30-second rescue cycles after unanswered or incorrect attempts.
• Each world has separately saved level progress. Endless procedurally generated levels follow recurring building patterns.
• Finishing stage 5 prompts a four-part exam gate (5+5+5+20 questions) before stage 6. Once it is complete, the dress-up studio unlocks.
• Each of four appearance categories has three options. First unlocked after level 5. Second requires passing a normal 5-question side quest; third requires passing a tough 10-question side quest.
• Dress, face and accessories have basic visible changes on the player; this is an early 2.5D/3D projection prototype, not a polished skeletal-animated Roblox avatar.
• Parent progress dashboard logs attempted questions, wrong responses, scores, stage milestones and deaths. Data is local to the device and can be exported to JSON.

CONTROLS
Desktop: WASD or arrows to move, Space to jump. Mobile: virtual joystick and JUMP. Top: map, dress-up, parent progress, subject menu, math sprint, reset.

ADDING EDUCATIONAL CONTENT WITH CHATGPT
Send the subject and topic to ChatGPT, review its draft questions, then request a new Anblox package. New approved question packs can be added to content.js. Custom content editor is available but is not required.

NOTES
Development prototype. Full mobile/browser gameplay and educational curriculum validation are outstanding. No cloud synchronization or account backend. Avoid deleting site storage if progress should be kept. Export parent reports for backup.


VERSION 5 NOTES
- Parent report is protected by an initial local password: android. Change it from the unlocked parent report. This is a child-deterrent for a local web app, NOT robust authentication (code is inspectable).
- Parents can review timestamped questions, exact selected answers, correct answers, session timestamps, and active time. Data stays in this browser until storage is cleared.
- Active-time sessions start when PLAY is pressed, continue while the game tab is visible, and pause while the app is backgrounded. Time spent in menus and quizzes counts. Refresh/browser close closes the session at last saved timestamp (approximately 10-second recovery resolution).
- A single Level 5 graduation unlock applies across all worlds. Cosmetics are previewed in a visual SVG avatar studio and applied to the running character.

V7 Royal Style Studio:
- Princess-style outfit details, clearer face variants, independent Hair Salon with three styles, ornate wardrobe room, and animated reward celebration.
- Original five-category reward logic retained: Level 5 gift, normal side quest and tough side quest.
- Shared gameplay worlds, level logic, parent reports, and quiz content unchanged.
- Existing local save key unchanged so progression should migrate in place.
