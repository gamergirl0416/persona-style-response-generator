import { buildPrompt, recentMessages, unchanged, fitPrompt } from './prompt.js';
import { requestReply, canRegenerate, isGenerationActive, isRealGenerationStart, describeRequestError } from './generation.js';
import * as tavern from '/script.js';

const KEY = 'personaReply';
let busy = false;
let chatRevision = 0;
let lastReply = null;
const context = () => SillyTavern.getContext();
const settings = () => context().extensionSettings[KEY] ??= { guidance: '', tokens: 4000, lore: true };
const notify = (message, error = false) => globalThis.toastr?.[error ? 'error' : 'info'](message, 'Persona Reply', { escapeHtml: true, ...(error ? { timeOut: 15000, extendedTimeOut: 15000, closeButton: true } : {}) });

async function getLore(ctx, fields) {
    if (!settings().lore) return '';
    const { getWorldInfoPrompt } = await import('/scripts/world-info.js');
    const result = await getWorldInfoPrompt(
        recentMessages(ctx.chat).map(m => `${m.name}: ${m.mes}`).reverse(),
        Math.min(ctx.maxContext || 12000, 12000), true,
        { personaDescription: fields.persona, characterDescription: fields.description,
            characterPersonality: fields.personality, characterDepthPrompt: fields.charDepthPrompt,
            scenario: fields.scenario, creatorNotes: fields.creatorNotes, trigger: 'impersonate' },
    );
    return { before: result.worldInfoBefore, after: result.worldInfoAfter,
        examples: result.worldInfoExamples, depth: result.worldInfoDepth,
        notesBefore: result.anBefore, notesAfter: result.anAfter, outlets: result.outletEntries };
}

function updateRegenerate() {
    const input = document.querySelector('#send_textarea');
    const button = document.querySelector('#persona-reply-regenerate');
    if (button) button.disabled = busy || !input || !canRegenerate(lastReply, context(), input, chatRevision);
}

async function generateReply(regenerate = false, suggestion = '') {
    if (busy) return;
    const ctx = context();
    const input = document.querySelector('#send_textarea');
    if (!input || !ctx.getCurrentChatId()) return notify('Open a character or group chat first.');
    if (isGenerationActive(tavern, ctx)) return notify('Wait for the current generation to finish.');
    if (input.disabled) return notify('The reply box is disabled. Enable it before drafting a reply.');
    const profileId = settings().profileId || '';
    if (!profileId && ctx.onlineStatus === 'no_connection') return notify('Connect your AI in SillyTavern first.', true);
    if (regenerate && !canRegenerate(lastReply, ctx, input, chatRevision)) return notify('Generate a reply first. If you edited it, use the pen button to develop your new draft.');
    const originalDraft = regenerate ? lastReply.originalDraft : input.value;
    suggestion = regenerate ? lastReply.suggestion || '' : suggestion;
    const button = document.querySelector('#persona-reply-button');
    const snapshot = { chat: ctx.chat, id: ctx.getCurrentChatId(), name: ctx.name1,
        messages: JSON.stringify(ctx.chat), draft: input.value, revision: chatRevision };
    busy = true;
    updateRegenerate();
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
        const rawRequest = buildPrompt({ chat: ctx.chat, name: ctx.name1, fields, lore, notes,
            guidance: settings().guidance, draft: originalDraft, suggestion });
        const tokens = Math.min(4000, Math.max(64, Number(settings().tokens) || 4000));
        const activeLimit = ctx.mainApi === 'openai' ? Number(ctx.chatCompletionSettings.openai_max_context) : ctx.maxContext;
        const totalLimit = !profileId && activeLimit > 0 ? Math.min(16000, activeLimit) : 16000;
        const fitted = await fitPrompt(rawRequest, async text => {
            const measured = await ctx.getTokenCountAsync(text);
            // The active tokenizer may belong to a different model. A UTF-8 byte
            // upper estimate avoids assuming its count fits the profile model.
            return profileId ? Math.max(measured, new TextEncoder().encode(text).length) : measured;
        }, totalLimit);
        const request = fitted.request;
        if (fitted.trimmed.length) notify('Supporting context was reduced to fit the token budget. All eight available recent messages and your suggestion were retained.');
        if (isGenerationActive(tavern, context()) || snapshot.revision !== chatRevision || !unchanged(snapshot, context(), input)) return notify('Chat or draft changed. Click again when ready.');
        const reply = await requestReply(ctx, request, tokens, profileId, settings().includePreset !== false);
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
        lastReply = { ...snapshot, originalDraft, suggestion, reply: input.value };
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    } catch (error) {
        console.error('[Persona Reply]', error);
        notify(describeRequestError(error), true);
    } finally {
        busy = false;
        button.disabled = false;
        button.textContent = '✍';
        button.removeAttribute('aria-busy');
        updateRegenerate();
    }
}

function openWriteOptions() {
    if (busy || document.querySelector('#persona-reply-options')) return;
    const ctx = context();
    const revision = chatRevision;
    const chatId = ctx.getCurrentChatId();
    const name = ctx.name1;
    const dialog = document.createElement('dialog');
    dialog.id = 'persona-reply-options';
    dialog.innerHTML = `<form method="dialog">
        <h3>Persona Reply</h3>
        <p>Write now, or give a direction for your next reply.</p>
        <label for="persona-reply-suggestion">Suggest what to write</label>
        <textarea id="persona-reply-suggestion" class="text_pole" placeholder="e.g. Hesitate before accepting the invitation. Ask where we are going, with a playful tone."></textarea>
        <div id="persona-reply-character-count" aria-live="polite">0 / 500 characters</div>
        <p>Uses the last 8 messages and available scene, persona, and lore context. 16,000 total token budget, with 4,000 reserved for the reply.</p>
        <div class="persona-reply-actions">
            <button type="button" class="menu_button" data-action="write">Write now</button>
            <button type="button" class="menu_button" data-action="suggest" disabled>Write with suggestion</button>
            <button type="submit" class="menu_button">Cancel</button>
        </div>
    </form>`;
    const text = dialog.querySelector('textarea');
    const suggest = dialog.querySelector('[data-action="suggest"]');
    text.addEventListener('input', () => {
        const chars = Array.from(text.value);
        if (chars.length > 500) text.value = chars.slice(0, 500).join('');
        dialog.querySelector('#persona-reply-character-count').textContent = `${Array.from(text.value).length} / 500 characters`;
        suggest.disabled = !text.value.trim();
    });
    for (const button of dialog.querySelectorAll('[data-action]')) {
        button.addEventListener('click', () => {
            const current = context();
            if (revision !== chatRevision || chatId !== current.getCurrentChatId() || name !== current.name1) {
                dialog.close();
                return notify('The chat or persona changed. Reopen the writing options.');
            }
            const direction = button.dataset.action === 'suggest' ? text.value.trim() : '';
            dialog.close();
            void generateReply(false, direction);
        });
    }
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
    text.focus();
}

function initialize() {
    if (document.querySelector('#persona-reply-button')) return;
    const host = document.querySelector('#leftSendForm');
    if (!host) return;
    if (!settings().suggestBudgetVersion) {
        settings().tokens = 4000;
        settings().suggestBudgetVersion = 1;
        context().saveSettingsDebounced();
    }
    const button = document.createElement('button');
    button.id = 'persona-reply-button';
    button.type = 'button';
    button.textContent = '✍';
    button.title = 'Write now or suggest a reply (last 8 messages)';
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', openWriteOptions);
    const toolbar = document.createElement('span');
    toolbar.id = 'persona-reply-tools';
    const regenerate = document.createElement('button');
    regenerate.id = 'persona-reply-regenerate';
    regenerate.type = 'button';
    regenerate.textContent = '↻';
    regenerate.title = 'Regenerate reply using the original draft guidance';
    regenerate.setAttribute('aria-label', regenerate.title);
    regenerate.disabled = true;
    regenerate.addEventListener('click', () => generateReply(true));
    toolbar.append(button, regenerate);
    host.append(toolbar);
    document.querySelector('#send_textarea')?.addEventListener('input', updateRegenerate);

    const panel = document.createElement('div');
    panel.className = 'persona-reply-settings';
    panel.innerHTML = `<div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>Persona Reply</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <p>Use ✍ to draft and ↻ for another version. Review and send when ready. Text already in the box guides the draft.</p>
            <label>Response API / connection profile<select class="text_pole" data-setting="profileId"><option value="">Current connection</option></select></label>
            <button type="button" class="menu_button" id="persona-reply-refresh">Refresh profiles</button>
            <label class="checkbox_label"><input data-setting="includePreset" type="checkbox">Apply saved profile’s sampling preset</label>
            <p>For a failing saved profile, uncheck this to test a basic request. This omits its sampling and routing preset; the saved API, model, and key are still used. Current connection is unaffected.</p>
            <p>Save an API, model, endpoint, and key in SillyTavern’s Connection Profile panel, then select it here. The main chat connection stays unchanged.</p>
            <label>Writing guidance<textarea class="text_pole" data-setting="guidance" placeholder="e.g. Short replies, casual dialogue, actions in asterisks"></textarea></label>
            <label>Maximum reply tokens<input class="text_pole" data-setting="tokens" type="number" min="64" max="4000" step="1"></label>
            <p>16,000 total token budget: 12,000 input (including a 512-token formatting reserve) + up to 4,000 output. Recent messages and your suggestion are protected when trimming context.</p>
            <label class="checkbox_label"><input data-setting="lore" type="checkbox">Include relevant lorebook entries</label>
            <p>Uses your persona, up to 8 past replies under its current name, character/scenario details, and available extension notes (such as Author’s Note and summary).</p>
        </div></div>`;
    for (const field of panel.querySelectorAll('[data-setting]')) {
        const key = field.dataset.setting;
        if (field.type === 'checkbox') field.checked = key === 'includePreset' ? settings()[key] !== false : settings()[key];
        else field.value = settings()[key] ?? '';
        field.addEventListener('input', () => {
            settings()[key] = field.type === 'checkbox' ? field.checked : field.value;
            context().saveSettingsDebounced();
        });
    }
    document.querySelector('#extensions_settings')?.append(panel);
    const refreshProfiles = () => {
        const select = panel.querySelector('[data-setting="profileId"]');
        const selected = settings().profileId || '';
        select.replaceChildren(new Option('Current connection', ''));
        try {
            const profiles = context().ConnectionManagerRequestService?.getSupportedProfiles() || [];
            for (const profile of profiles) select.add(new Option(`${profile.name}${profile.model ? ` — ${profile.model}` : ''}`, profile.id));
        } catch (error) {
            console.warn('[Persona Reply] Profiles unavailable:', error);
        }
        if (selected && !Array.from(select.options).some(option => option.value === selected)) {
            select.add(new Option('Saved profile unavailable — choose another', selected));
        }
        select.value = selected;
    };
    panel.querySelector('#persona-reply-refresh').addEventListener('click', refreshProfiles);
    refreshProfiles();
    const ctx = context();
    for (const name of ['CONNECTION_PROFILE_CREATED', 'CONNECTION_PROFILE_UPDATED', 'CONNECTION_PROFILE_DELETED']) {
        if (ctx.eventTypes[name]) ctx.eventSource.on(ctx.eventTypes[name], refreshProfiles);
    }
    ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => { chatRevision++; lastReply = null; updateRegenerate(); });
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, (type, options, dryRun) => {
        if (!isRealGenerationStart(type, options, dryRun)) return;
        chatRevision++;
        updateRegenerate();
    });
}

jQuery(initialize);
