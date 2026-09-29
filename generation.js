// Read live state on every click. GENERATION_STARTED also fires for previews and
// early exits, so it cannot safely be latched until a matching end event.
export function isGenerationActive(tavern, ctx) {
    if (typeof tavern.isGenerating === 'function') return Boolean(tavern.isGenerating());
    const stream = ctx.streamingProcessor;
    return Boolean(tavern.is_send_press || (stream && !stream.isFinished
        && !stream.isStopped && !stream.abortController?.signal?.aborted));
}

export function isRealGenerationStart(type, options, dryRun) {
    return !dryRun && type !== 'quiet';
}

export function describeRequestError(error) {
    const details = [];
    const seen = new Set();
    for (let current = error; current && !seen.has(current) && seen.size < 8; current = current.cause) {
        seen.add(current);
        const message = typeof current === 'string' ? current : current.message || current.error?.message;
        if (typeof message === 'string' && message.trim() && !details.includes(message.trim())) details.push(message.trim());
    }
    return details.join(' → ') || 'Generation failed. Check your AI connection and try again.';
}

export async function requestReply(ctx, request, tokens, profileId = '', includePreset = true) {
    if (!profileId) return ctx.generateRaw({ ...request, responseLength: tokens, trimNames: false });
    const service = ctx.ConnectionManagerRequestService;
    if (!service?.sendRequest) throw new Error('This SillyTavern version does not support profile requests. Update SillyTavern or select Current connection.');
    try {
        const result = await service.sendRequest(profileId, [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.prompt },
        ], tokens, { stream: false, extractData: true, includePreset, includeInstruct: true });
        return result?.content;
    } catch (error) {
        // Report only profile identity fields, never keys, URLs, or prompt bodies.
        let profile;
        try { profile = service.getProfile?.(profileId); } catch { /* Keep the original error. */ }
        if (!profile) throw error;
        throw new Error(`Profile: ${profile.name || profileId}; API: ${profile.api || '(missing)'}; model: ${profile.model || '(missing)'}; preset: ${includePreset ? profile.preset || '(none)' : 'disabled'}`, { cause: error });
    }
}

export function canRegenerate(last, ctx, input, revision) {
    return Boolean(last && last.chat === ctx.chat && last.id === ctx.getCurrentChatId()
        && last.name === ctx.name1 && last.revision === revision
        && last.messages === JSON.stringify(ctx.chat) && last.reply === input.value);
}
