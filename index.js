import { buildPrompt, recentMessages, unchanged } from './prompt.js';

const KEY = 'personaReply';
let busy = false;
let nativeGeneration = false;
let chatRevision = 0;
const context = () => SillyTavern.getContext();
const settings = () => context().extensionSettings[KEY] ??= { guidance: '', tokens: 300, lore: true };
const notify = (message, error = false) => globalThis.toastr?.[error ? 'error' : 'info'](message, 'Persona Reply');

async function getLore(ctx, fields) {
    if (!settings().lore) return '';
    const { getWorldInfoPrompt } = await import('/scripts/world-info.js');
    const result = await getWorldInfoPrompt(
        recentMessages(ctx.chat).map(m => `${m.name}: ${m.mes}`).reverse(),
        ctx.maxContext, true,
        { personaDescription: fields.persona, characterDescription: fields.description,
            characterPersonality: fields.personality, characterDepthPrompt: fields.charDepthPrompt,
            scenario: fields.scenario, creatorNotes: fields.creatorNotes, trigger: 'impersonate' },
    );
    return { before: result.worldInfoBefore, after: result.worldInfoAfter,
        examples: result.worldInfoExamples, depth: result.worldInfoDepth,
        notesBefore: result.anBefore, notesAfter: result.anAfter, outlets: result.outletEntries };
}

async function generateReply() {
    if (busy) return;
    const ctx = context();
    const input = document.querySelector('#send_textarea');
    if (!input || !ctx.getCurrentChatId()) return notify('Open a character or group chat first.');
    if (nativeGeneration || (ctx.streamingProcessor && !ctx.streamingProcessor.isFinished) || input.disabled) return notify('Wait for the current generation to finish.');
    if (ctx.onlineStatus === 'no_connection') return notify('Connect your AI in SillyTavern first.', true);
    const button = document.querySelector('#persona-reply-button');
    const snapshot = { chat: ctx.chat, id: ctx.getCurrentChatId(), name: ctx.name1,
        messages: JSON.stringify(ctx.chat), draft: input.value, revision: chatRevision };
    busy = true;
    button.disabled = true;
    button.textContent = '…';
    button.setAttribute('aria-busy', 'true');
    try {
        const fields = ctx.getCharacterCardFields();
        const lore = await getLore(ctx, fields);
        if (snapshot.revision !== chatRevision || !unchanged(snapshot, context(), input)) return notify('Chat or draft changed. Click again when ready.');
        const notes = Object.entries(ctx.extensionPrompts || {})
            .filter(([key, value]) => value?.value && !/^(QUIET_PROMPT|QUIET|TEMP)/i.test(key))
            .map(([source, value]) => ({ source, text: ctx.substituteParams(value.value) }));
        const request = buildPrompt({ chat: ctx.chat, name: ctx.name1, fields, lore, notes,
            guidance: settings().guidance, draft: snapshot.draft });
        const tokens = Math.min(2000, Math.max(64, Number(settings().tokens) || 300));
        const count = await ctx.getTokenCountAsync(request.systemPrompt + '\n' + request.prompt);
        const limit = ctx.mainApi === 'openai' ? Number(ctx.chatCompletionSettings.openai_max_context) : ctx.maxContext;
        if (count + tokens + 256 > limit) throw new Error('Context is too large. Reduce saved notes, writing examples, or disable lorebook context in Persona Reply settings.');
        if (nativeGeneration || snapshot.revision !== chatRevision || !unchanged(snapshot, context(), input)) return notify('Chat or draft changed. Click again when ready.');
        const reply = await ctx.generateRaw({ ...request, responseLength: tokens, trimNames: false });
        if (typeof reply !== 'string' || !reply.trim()) throw new Error('The AI returned an empty reply.');
        if (snapshot.revision !== chatRevision || !unchanged(snapshot, context(), input)) {
            const preview = document.createElement('pre');
            preview.className = 'persona-reply-preview';
            preview.textContent = reply.trim();
            notify('Your chat or draft changed. The generated reply is shown separately for copying.');
            await ctx.callGenericPopup(preview, ctx.POPUP_TYPE.TEXT);
            return;
        }
        input.value = reply.trim();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    } catch (error) {
        console.error('[Persona Reply]', error);
        notify(error?.message || 'Generation failed. Check your AI connection and try again.', true);
    } finally {
        busy = false;
        button.disabled = false;
        button.textContent = '✍';
        button.removeAttribute('aria-busy');
    }
}

function initialize() {
    if (document.querySelector('#persona-reply-button')) return;
    const host = document.querySelector('#leftSendForm');
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'persona-reply-button';
    button.type = 'button';
    button.textContent = '✍';
    button.title = 'Draft a reply as your persona (last 5 messages)';
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', generateReply);
    host.append(button);

    const panel = document.createElement('div');
    panel.className = 'persona-reply-settings';
    panel.innerHTML = `<div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>Persona Reply</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <p>Use ✍ beside the reply box to draft with your current AI connection. Review and send when ready. Text already in the box guides the draft.</p>
            <label>Writing guidance<textarea class="text_pole" data-setting="guidance" placeholder="e.g. Short replies, casual dialogue, actions in asterisks"></textarea></label>
            <label>Maximum reply tokens<input class="text_pole" data-setting="tokens" type="number" min="64" max="2000" step="1"></label>
            <label class="checkbox_label"><input data-setting="lore" type="checkbox">Include relevant lorebook entries</label>
            <p>Uses your persona, up to 8 past replies under its current name, character/scenario details, and available extension notes (such as Author’s Note and summary).</p>
        </div></div>`;
    for (const field of panel.querySelectorAll('[data-setting]')) {
        const key = field.dataset.setting;
        if (field.type === 'checkbox') field.checked = settings()[key];
        else field.value = settings()[key];
        field.addEventListener('input', () => {
            settings()[key] = field.type === 'checkbox' ? field.checked : field.value;
            context().saveSettingsDebounced();
        });
    }
    document.querySelector('#extensions_settings')?.append(panel);
    const ctx = context();
    ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => { chatRevision++; });
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, () => { nativeGeneration = true; chatRevision++; });
    ctx.eventSource.on(ctx.eventTypes.GENERATION_ENDED, () => { nativeGeneration = false; });
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STOPPED, () => { nativeGeneration = false; });
}

jQuery(initialize);
