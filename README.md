# Persona Reply for SillyTavern

A small personal extension: click **✍** next to the reply box to draft your next message as your active persona. It places the result in the compose box; it never sends the message automatically.

## Install

1. In your actual SillyTavern installation, create `public/scripts/extensions/third-party/persona-reply/`.
2. Copy `manifest.json`, `index.js`, `prompt.js`, and `style.css` into that folder (directly, without another nested folder).
3. Reload SillyTavern. Open **Extensions → Persona Reply** for optional writing guidance and reply length.
4. Connect your usual AI, open a chat, select your persona, and click **✍** beside the message box.

No build step, separate server, API key, or npm install is required. This workspace contains the extension, not a SillyTavern installation. To remove it, delete the installed `persona-reply` folder and reload.

## Context and behavior

- Last five non-system chat messages, in order (or all available when fewer exist).
- Active persona description and up to eight prior user replies with the active persona's exact name, used as writing examples. Renaming your persona means old names no longer match.
- Character description, personality, scenario, and available extension prompts such as Author's Note or summary. These prompts must already have been populated by their extensions.
- Optional lorebook scan against the five recent messages, using SillyTavern's dry-run scan and impersonation trigger. Lorebook activation rules and budgets still apply; dry runs can differ from a normal generation's timed effects.
- Optional writing guidance and any text already in the compose box, which is treated as a draft to develop.

Uses the currently selected SillyTavern model/API and its connection settings. The context above is sent to that provider and normal generation costs apply. It does not train a model or retrieve the full chat, attachments, or Data Bank. Other extensions may modify raw generation requests. Style accuracy depends on your model and examples.

If you type or change chats during generation, the result is shown separately for copying instead of overwriting your input. Oversized prompts produce an error before generation rather than silently dropping context. If lorebook loading fails, the error is reported; you can disable lore context in settings to continue.

## Development and verification

Run `node --test`, `node --check index.js`, and `node --check prompt.js` with Node.js (or `npm test` and `npm run check` if npm is available). No dependencies are needed. APIs and compose-box selectors were checked against the official SillyTavern `release` source on September 29, 2026. An end-to-end check in your running SillyTavern instance with your connected model is still required.

Manual check: confirm persona and notes influence a draft, the message is not sent, typing during generation is preserved, switching chats cannot insert the reply into the other chat, and connection errors leave existing text intact.

Official source: https://github.com/SillyTavern/SillyTavern
