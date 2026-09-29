# Persona Reply for SillyTavern

A small personal extension: click **✍** next to the reply box to draft your next message as your active persona. It places the result in the compose box; it never sends the message automatically.

## Install

1. In your actual SillyTavern installation, create `public/scripts/extensions/third-party/persona-reply/`.
2. Copy `manifest.json`, `index.js`, `prompt.js`, `generation.js`, and `style.css` into that folder (directly, without another nested folder).
3. Reload SillyTavern. Open **Extensions → Persona Reply** for optional writing guidance and reply length.
4. Connect your usual AI, open a chat, select your persona, and click **✍** beside the message box.

No build step, separate server, API key, or npm install is required. This workspace contains the extension, not a SillyTavern installation. To remove it, delete the installed `persona-reply` folder and reload.

## Write now and Suggest (v1.2)

Click **✍** to open the writing options. **Write now** drafts from the chat and any text in your reply box. **Suggest what to write** accepts up to 500 Unicode characters of direction; **Write with suggestion** turns that direction into a full persona reply. The counter updates as you type and pasted text is capped at 500 characters. Cancel or Escape closes the options without generating.

Both modes use the latest eight non-system messages, including the latest character response when it falls within that window. Scene and location are inferred from the recent conversation, scenario, lore, and existing notes; there is no separate location tracker or invented location. Regenerate preserves the original suggestion and draft.

The total budget is 16,000 tokens, reserving 4,000 output tokens and 512 tokens within the input allocation for formatting. The extension's prompt is limited to 11,488 counted input tokens. Older style examples are removed first when necessary, then lore, character background, saved context, and scenario sections. Recent messages, persona, suggestion, and draft are never silently truncated; if these alone exceed the budget, generation stops with an explanation. A notice appears if supporting context is reduced.

**v1.2.1 fix:** The previous saved-profile estimate incorrectly treated UTF-8 byte length as token count, causing premature budget errors. All requests now use SillyTavern's token counter with no added tokenizer padding. Saved profiles add a 10% estimation margin because the active tokenizer may belong to another model. Final model tokenization, instruct templates, provider formatting, and other extensions' additions may differ; these reserves are not a guarantee of the provider's exact count. Models with smaller context windows may still reject a request. Current connection also respects a smaller configured context limit. Budget errors report estimated input versus available input and clarify that the whole context counts, not just the suggestion.

Upgrading to v1.2 sets the reply maximum to 4,000 once. You can lower it afterward in settings. The 4,000-token reservation remains to keep the input budget fixed. API/profile choices and the sampling-preset checkbox are preserved.

## API selection and regeneration

**v1.1.3 troubleshooting:** Saved-profile errors now identify the profile's saved API, model, and preset. Uncheck **Apply saved profile’s sampling preset** to test a basic request with the same saved API/model/key but without the sampling/routing preset. This is an explicit diagnostic option, not an automatic retry or a confirmed fix for every “Not Found” error. It does not change Current connection requests. Re-enable it to restore your preset preferences.

**v1.1.2 diagnostics:** Error notifications now show nested error causes returned by SillyTavern's profile service, rather than just “API request failed.” Errors stay visible longer and are rendered as plain text. This improves diagnosis; it does not claim to fix every OpenRouter free-model failure.

For OpenRouter failures, compare Persona Reply's **Current connection** option with the saved profile while the same free model is selected in the main chat. If Current connection works, check that the saved profile has the correct exact model ID, saved key, and preset. Presets can contain different provider restrictions, quantization filters, and sampling settings than the active chat. If both fail, inspect the detailed error and SillyTavern server log. The profile service may discard HTTP status and provider metadata, so some errors still require server logs. Do not post API keys or full private request bodies when reporting an error.

**v1.1.1 fix:** Busy detection now reads SillyTavern's live generation status instead of retaining a flag from generation events. Prompt previews and background quiet-generation events no longer invalidate the regenerate button. Legacy streaming checks ignore stopped or aborted streams. Replace the extension files and reload the page to clear the old code's stuck flag.

In **Extensions → Persona Reply → Response API / connection profile**, choose **Current connection** or a saved SillyTavern connection profile such as VoidAI. Create/save the desired API, endpoint, model, and secret selection in SillyTavern's Connection Profile panel first. Click **Refresh profiles** if needed. Saved profiles use SillyTavern's Connection Manager request service without switching the main chat connection. Supported profiles are Chat Completion and Text Completion; other APIs remain usable through Current connection. A recent SillyTavern version with the profile request service and enabled Connection Manager is required for separate profiles. Missing/deleted profiles report an error rather than falling back to a different API.

After generating, click **↻** beside **✍** to request another version using the original draft guidance, the current extension settings, and the selected API. It replaces only the untouched generated draft. Editing the draft disables regeneration; use **✍** to develop your edited text instead. Changing chats, personas, or conversation content invalidates the previous draft. Regeneration makes another model request, so normal provider costs apply and identical replies are possible depending on sampling settings.

The pen is now 18px (previously 24px), with compact fixed-size buttons and spacing to avoid overlapping adjacent controls. Update all extension files, including the new `generation.js`, in your GitHub repository root, update the installed extension, then reload SillyTavern.

## Context and behavior

- Last eight non-system chat messages, in order (or all available when fewer exist).
- Active persona description and up to eight prior user replies with the active persona's exact name, used as writing examples. Renaming your persona means old names no longer match.
- Character description, personality, scenario, and available extension prompts such as Author's Note or summary. These prompts must already have been populated by their extensions.
- Optional lorebook scan against the eight recent messages, using SillyTavern's dry-run scan and impersonation trigger. Lorebook activation rules and budgets still apply; dry runs can differ from a normal generation's timed effects.
- Optional writing guidance and any text already in the compose box, which is treated as a draft to develop.

Uses the current SillyTavern model/API by default, or the saved profile chosen in this extension. The context above is sent to that provider and normal generation costs apply. It does not train a model or retrieve the full chat, attachments, or Data Bank. Other extensions may modify raw generation requests. Style accuracy depends on your model and examples.

If you type or change chats during generation, the result is shown separately for copying instead of overwriting your input. Both request paths apply the budget described above. Lorebook scanning uses at most a 12,000-token context budget. If lorebook loading fails, the error is reported; you can disable lore context in settings to continue.

## Development and verification

Run `node --test`, `node --check index.js`, `node --check prompt.js`, and `node --check generation.js` with Node.js (or `npm test` and `npm run check` if npm is available). No dependencies are needed. APIs and compose-box selectors were checked against the official SillyTavern `release` source on September 29, 2026. An end-to-end check in your running SillyTavern instance with your connected model is still required.

Manual check: confirm persona and notes influence a draft, the message is not sent, typing during generation is preserved, switching chats cannot insert the reply into the other chat, and connection errors leave existing text intact.

Official source: https://github.com/SillyTavern/SillyTavern
