export async function requestReply(ctx, request, tokens, profileId = '') {
    if (!profileId) return ctx.generateRaw({ ...request, responseLength: tokens, trimNames: false });
    const service = ctx.ConnectionManagerRequestService;
    if (!service?.sendRequest) throw new Error('This SillyTavern version does not support profile requests. Update SillyTavern or select Current connection.');
    const result = await service.sendRequest(profileId, [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.prompt },
    ], tokens, { stream: false, extractData: true, includePreset: true, includeInstruct: true });
    return result?.content;
}

export function canRegenerate(last, ctx, input, revision) {
    return Boolean(last && last.chat === ctx.chat && last.id === ctx.getCurrentChatId()
        && last.name === ctx.name1 && last.revision === revision
        && last.messages === JSON.stringify(ctx.chat) && last.reply === input.value);
}
