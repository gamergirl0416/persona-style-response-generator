# Persona Reply for SillyTavern

A small personal extension: click **✍** next to the reply box to draft your next message as your active persona. It places the result in the compose box; it never sends the message automatically.

## Install

1. In your actual SillyTavern installation, create `public/scripts/extensions/third-party/persona-reply/`.
2. Copy `manifest.json`, `index.js`, `prompt.js`, `generation.js`, and `style.css` into that folder (directly, without another nested folder).
3. Reload SillyTavern. Open **Extensions → Persona Reply** for optional writing guidance and reply length.
4. Connect your usual AI, open a chat, select your persona, and click **✍** beside the message box.

No build step, separate server, API key, or npm install is required. This workspace contains the extension, not a SillyTavern installation. To remove it, delete the installed `persona-reply` folder and reload.

## API selection and regeneration (v1.1)

In **Extensions → Persona Reply → Response API / connection profile**, choose **Current connection** or a saved SillyTavern connection profile such as VoidAI. Create/save the desired API, endpoint, model, and secret selection in SillyTavern's Connection Profile panel first. Click **Refresh profiles** if needed. Saved profiles use SillyTavern's Connection Manager request service without switching the main chat connection. Supported profiles are Chat Completion and Text Completion; other APIs remain usable through Current connection. A recent SillyTavern version with the profile request service and enabled Connection Manager is required for separate profiles. Missing/deleted profiles report an error rather than falling back to a different API.

After generating, click **↻** beside **✍** to request another version using the original draft guidance, the current extension settings, and the selected API. It replaces only the untouched generated draft. Editing the draft disables regeneration; use **✍** to develop your edited text instead. Changing chats, personas, or conversation content invalidates the previous draft. Regeneration makes another model request, so normal provider costs apply and identical replies are possible depending on sampling settings.

The pen is now 18px (previously 24px), with compact fixed-size buttons and spacing to avoid overlapping adjacent controls. Update all extension files, including the new `generation.js`, in your GitHub repository root, update the installed extension, then reload SillyTavern.

## Context and behavior

- Last five non-system chat messages, in order (or all available when fewer exist).
- Active persona description and up to eight prior user replies with the active persona's exact name, used as writing examples. Renaming your persona means old names no longer match.
- Character description, personality, scenario, and available extension prompts such as Author's Note or summary. These prompts must already have been populated by their extensions.
- Optional lorebook scan against the five recent messages, using SillyTavern's dry-run scan and impersonation trigger. Lorebook activation rules and budgets still apply; dry runs can differ from a normal generation's timed effects.
- Optional writing guidance and any text already in the compose box, which is treated as a draft to develop.

Uses the current SillyTavern model/API by default, or the saved profile chosen in this extension. The context above is sent to that provider and normal generation costs apply. It does not train a model or retrieve the full chat, attachments, or Data Bank. Other extensions may modify raw generation requests. Style accuracy depends on your model and examples.

If you type or change chats during generation, the result is shown separately for copying instead of overwriting your input. Current connection requests check the active context limit before generation. Separate profile requests rely on the selected provider's context-limit validation, because the main connection's tokenizer and limit may not match that profile. Lorebook scanning uses the main chat's context budget. If lorebook loading fails, the error is reported; you can disable lore context in settings to continue.

## Development and verification

Run `node --test`, `node --check index.js`, `node --check prompt.js`, and `node --check generation.js` with Node.js (or `npm test` and `npm run check` if npm is available). No dependencies are needed. APIs and compose-box selectors were checked against the official SillyTavern `release` source on September 29, 2026. An end-to-end check in your running SillyTavern instance with your connected model is still required.

Manual check: confirm persona and notes influence a draft, the message is not sent, typing during generation is preserved, switching chats cannot insert the reply into the other chat, and connection errors leave existing text intact.

Official source: https://github.com/SillyTavern/SillyTavern
