import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, recentMessages, unchanged } from '../prompt.js';

test('uses exactly the last five non-system messages in chronological order', () => {
    const chat = Array.from({ length: 10 }, (_, i) => ({ mes: String(i), name: 'Pat' }));
    chat.push({ is_system: true, mes: 'system note' });
    assert.deepEqual(recentMessages(chat).map(m => m.mes), ['5', '6', '7', '8', '9']);
});

test('style examples belong only to the active persona and context survives', () => {
    const chat = [{ is_user: true, name: 'Other persona', mes: 'exclude' },
        ...Array.from({ length: 12 }, (_, i) => ({ is_user: true, name: 'Pat', mes: `sample ${i}` }))];
    const request = buildPrompt({ chat, name: 'Pat', fields: { persona: 'Friendly', scenario: 'Cafe' },
        notes: ['Remember tea'], lore: 'Rainy city', guidance: 'Brief', draft: 'Hello' });
    const data = JSON.parse(request.prompt);
    assert.equal(data.writingExamples.length, 8);
    assert.equal(data.writingExamples[0], 'sample 4');
    assert.equal(data.recentConversation.length, 5);
    assert.equal(data.personaDescription, 'Friendly');
    assert.equal(data.draftToDevelop, 'Hello');
    assert.deepEqual(data.savedContext, ['Remember tea']);
});

test('changed chat, persona, messages, or draft cannot be overwritten', () => {
    const chat = [{ mes: 'Hello' }];
    const ctx = { chat, name1: 'Pat', getCurrentChatId: () => 'chat-a' };
    const snapshot = { chat, name: 'Pat', id: 'chat-a', messages: JSON.stringify(chat), draft: '' };
    assert.equal(unchanged(snapshot, ctx, { value: '' }), true);
    assert.equal(unchanged(snapshot, ctx, { value: 'typing' }), false);
    assert.equal(unchanged(snapshot, { ...ctx, name1: 'Other' }, { value: '' }), false);
    assert.equal(unchanged(snapshot, { ...ctx, getCurrentChatId: () => 'chat-b' }, { value: '' }), false);
    chat[0].mes = 'Edited';
    assert.equal(unchanged(snapshot, ctx, { value: '' }), false);
});
