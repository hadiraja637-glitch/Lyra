import { GoogleGenAI, Modality } from '@google/genai';

type Memory = {
  id: string;
  category: string;
  content: string;
  source?: string;
  createdAt: number;
};

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
const voicePreviewCache = new Map<string, string>();

function json(res: any, status: number, payload: unknown) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readPath(req: any) {
  return new URL(req.url || '/', 'https://lyra.invalid').pathname
    .replace(/^\/api\/?/, '')
    .replace(/\/+$/, '');
}

function safeError(err: any, fallback: string) {
  const message = String(err?.message || fallback);
  if (/api.?key|credential|unauthorized|permission/i.test(message)) {
    return 'Gemini API authentication failed. Check GEMINI_API_KEY in Vercel Environment Variables.';
  }
  if (/quota|resource_exhausted|429/i.test(message)) {
    return 'Gemini usage quota or rate limit reached. Please wait and try again.';
  }
  return message.slice(0, 500) || fallback;
}

function systemPrompt(body: any, memories: Memory[] = []) {
  const memoryLines = memories
    .filter((m) => m && typeof m.content === 'string')
    .slice(0, 80)
    .map((m) => `- [${String(m.category || 'preferences')}] ${m.content}`)
    .join('\n');
  return `You are Lyra, a warm, intelligent, natural AI companion. Be friendly, thoughtful, honest, and conversational. Match the user's language naturally, especially English, Pakistani Urdu, and Roman Urdu. Keep voice replies concise unless the user asks for detail. Give useful advice without pretending to be human.
User name: ${body.userName || 'not provided'}
Preferred language: ${body.preferredLang || 'auto'}
Interests: ${Array.isArray(body.interests) ? body.interests.join(', ') : 'not specified'}
Saved user memories (use only when relevant):
${memoryLines || '- No saved memories supplied.'}
If the user explicitly asks to remember a fact, include one final tag in this exact format: [REMEMBER: preferences | the fact to save]. Use one of these categories: identity, preferences, goals, life, communication. Never include passwords, API keys, or secrets in a memory tag.`;
}

function extractMemory(reply: string): { reply: string; memory: Memory | null } {
  const match = reply.match(/\[REMEMBER:\s*([a-zA-Z_-]+)\s*\|\s*([\s\S]*?)\]/i);
  if (!match) return { reply, memory: null };
  const allowed = ['identity', 'preferences', 'goals', 'life', 'communication'];
  const category = allowed.includes(match[1].toLowerCase()) ? match[1].toLowerCase() : 'preferences';
  const content = match[2].trim();
  if (!content || /password|api.?key|secret|token/i.test(content)) {
    return { reply: reply.replace(match[0], '').trim(), memory: null };
  }
  return {
    reply: reply.replace(match[0], '').trim(),
    memory: {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      category,
      content,
      source: 'learned',
      createdAt: Date.now(),
    },
  };
}

function pcm16Base64ToWavBase64(pcmBase64: string, sampleRate = 24000) {
  const binary = atob(pcmBase64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, pcm.length, true);
  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  let encoded = '';
  const chunk = 0x8000;
  for (let i = 0; i < wav.length; i += chunk) {
    encoded += String.fromCharCode(...wav.subarray(i, Math.min(i + chunk, wav.length)));
  }
  return btoa(encoded);
}

async function generateSpeech(text: string, voice: string) {
  const result = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } },
    },
  });
  const audio = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
  return audio ? pcm16Base64ToWavBase64(audio) : null;
}

export default async function handler(req: any, res: any) {
  try {
    const route = readPath(req);
    const method = String(req.method || 'GET').toUpperCase();
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (route === 'status' && method === 'GET') {
      return json(res, 200, {
        status: 'ok',
        hasKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
        runtime: 'vercel-function',
        timestamp: new Date().toISOString(),
      });
    }

    if (route === 'memories' && method === 'GET') {
      // The browser's localStorage is the durable per-user memory store.
      return json(res, 200, { memories: [] });
    }

    if (route === 'memories' && method === 'POST') {
      const content = String(body.content || '').trim();
      if (!content) return json(res, 400, { error: 'Memory content is required.' });
      return json(res, 200, {
        memory: {
          id: 'mem_' + Date.now(),
          category: body.category || 'preferences',
          content,
          source: body.source || 'manual',
          createdAt: Date.now(),
        },
        success: true,
      });
    }

    if (route.startsWith('memories/') && method === 'PUT') {
      const id = route.split('/')[1] || '';
      const content = String(body.content || '').trim();
      if (!id || !content) return json(res, 400, { error: 'Memory id and content are required.' });
      return json(res, 200, { success: true, memory: { id, content, category: body.category || 'preferences' } });
    }

    if (route.startsWith('memories/') && method === 'DELETE') {
      return json(res, 200, { success: true });
    }

    if (route === 'memories/sync' && method === 'POST') {
      return json(res, 200, { success: true, memories: Array.isArray(body.memories) ? body.memories : [] });
    }

    if (route === 'live-token' && method === 'POST') {
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return json(res, 503, { error: 'GEMINI_API_KEY is missing from Vercel Environment Variables.' });
      }
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        },
      });
      if (!token?.name) return json(res, 502, { error: 'Gemini did not return a Live API session token.' });
      return json(res, 200, { token: token.name });
    }

    if (route === 'preview-voice' && method === 'POST') {
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return json(res, 503, { error: 'GEMINI_API_KEY is missing from Vercel Environment Variables.' });
      }
      const voice = String(body.voice || 'Kore');
      const cached = voicePreviewCache.get(voice);
      if (cached) return json(res, 200, { audioBase64: cached, mimeType: 'audio/wav', cached: true });
      const phrases: Record<string, string> = {
        Kore: "Hi there! I'm Lyra. I'm glad to talk with you today.",
        Aoede: "Hello! I'm Lyra. Let's explore ideas and learn together!",
        Leda: "Hello, I'm Lyra. Take a breath; we'll work through this together.",
        Callirrhoe: "Hi! I'm Lyra, ready to help you learn and think things through.",
        Fenrir: "Hey! I'm Lyra. Let's get focused and make progress.",
        Puck: "Hey there! Let's make learning a little more fun.",
        Charon: "Hello. Take your time; we'll work through this carefully.",
        Zephyr: "Hi! I'm Lyra. Let's talk and plan your day.",
      };
      const audioBase64 = await generateSpeech(phrases[voice] || "Hello, I'm Lyra, your AI companion.", voice);
      if (!audioBase64) return json(res, 502, { error: 'Gemini returned no audio for this voice preview.' });
      voicePreviewCache.set(voice, audioBase64);
      return json(res, 200, { audioBase64, mimeType: 'audio/wav', cached: false });
    }

    if (route === 'chat' && method === 'POST') {
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return json(res, 503, { error: 'GEMINI_API_KEY is missing from Vercel Environment Variables.' });
      }
      const message = String(body.message || '').trim();
      if (!message) return json(res, 400, { error: 'Message is required.' });
      const memories = Array.isArray(body.memories) ? body.memories as Memory[] : [];
      const contents: any[] = [];
      if (Array.isArray(body.history)) {
        for (const item of body.history.slice(-8)) {
          if (!item?.text) continue;
          contents.push({ role: item.sender === 'user' ? 'user' : 'model', parts: [{ text: String(item.text) }] });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });
      const result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: { systemInstruction: systemPrompt(body, memories), temperature: 0.8 },
      });
      const extracted = extractMemory(result.text || 'I am here with you.');
      let audioBase64: string | null = null;
      if (body.responseMode !== 'text-only') {
        try {
          audioBase64 = await generateSpeech(extracted.reply, String(body.voice || 'Kore'));
        } catch (speechError) {
          console.warn('[Lyra API] Speech generation failed; returning text:', safeError(speechError, 'Speech generation failed'));
        }
      }
      return json(res, 200, {
        text: extracted.reply,
        replyText: extracted.reply,
        audioBase64,
        replyAudioBase64: audioBase64,
        mimeType: 'audio/wav',
        newMemory: extracted.memory,
      });
    }

    if (route === 'voice-message' && method === 'POST') {
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return json(res, 503, { error: 'GEMINI_API_KEY is missing from Vercel Environment Variables.' });
      }
      const audioBase64 = String(body.audioBase64 || '');
      if (!audioBase64) return json(res, 400, { error: 'Audio data is required.' });
      if (audioBase64.length > 5_500_000) {
        return json(res, 413, { error: 'This voice recording is too large for the current Vercel request limit. Please send a shorter voice message.' });
      }
      const memories = Array.isArray(body.memories) ? body.memories as Memory[] : [];
      const result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: audioBase64, mimeType: String(body.mimeType || 'audio/webm') } },
            { text: 'Transcribe the voice note in its original language, then answer naturally as Lyra. Format exactly as [TRANSCRIPTION]: <transcription>\\n[REPLY]: <reply>. If the user explicitly asks you to remember a personal fact, append [REMEMBER: category | fact] to the reply.' },
          ],
        }],
        config: { systemInstruction: systemPrompt(body, memories), temperature: 0.8 },
      });
      const raw = result.text || '';
      const transcriptionMatch = raw.match(/\[TRANSCRIPTION\]:\s*([\s\S]*?)(?=\[REPLY\]:)/i);
      const replyMatch = raw.match(/\[REPLY\]:\s*([\s\S]*)/i);
      const userTranscription = transcriptionMatch?.[1]?.trim() || 'Voice message';
      const extracted = extractMemory(replyMatch?.[1]?.trim() || raw);
      let replyAudioBase64: string | null = null;
      if (body.responseMode !== 'text-only') {
        try {
          replyAudioBase64 = await generateSpeech(extracted.reply, String(body.voice || 'Kore'));
        } catch (speechError) {
          console.warn('[Lyra API] Voice-note TTS failed; returning text:', safeError(speechError, 'TTS failed'));
        }
      }
      return json(res, 200, {
        userTranscription,
        transcription: userTranscription,
        replyText: extracted.reply,
        text: extracted.reply,
        replyAudioBase64,
        audioBase64: replyAudioBase64,
        mimeType: 'audio/wav',
        newMemory: extracted.memory,
      });
    }

    return json(res, 404, { error: `Unknown Lyra API endpoint: /${route || ''}` });
  } catch (err: any) {
    console.error('[Lyra API] Request failed:', err);
    const status = Number(err?.status || err?.statusCode || 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return json(res, safeStatus, { error: safeError(err, 'Lyra API request failed.') });
  }
}
