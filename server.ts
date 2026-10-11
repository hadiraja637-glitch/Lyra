import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.resolve(__dirname, 'public')));

// Manifest and Service Worker explicit endpoints for Windows PWA validation
app.get('/manifest.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.resolve(__dirname, 'public/manifest.json'));
});

app.get('/sw.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.resolve(__dirname, 'public/sw.js'));
});

// In-memory cache for voice previews to prevent rate-limit exhaustion
const voicePreviewCache = new Map<string, string>();

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory persistent memory cache synced across sessions
interface ServerMemoryItem {
  id: string;
  category: string;
  content: string;
  source?: string;
  createdAt: number;
}

let serverMemories: ServerMemoryItem[] = [
  {
    id: 'mem_1',
    category: 'communication',
    content: 'Prefers warm, authentic, conversational answers with personality and constructive honesty.',
    source: 'manual',
    createdAt: Date.now() - 3600000 * 24,
  },
  {
    id: 'mem_2',
    category: 'preferences',
    content: 'Enjoys conversational English, Pakistani Urdu, and natural code-switching.',
    source: 'manual',
    createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'mem_3',
    category: 'goals',
    content: 'Aims to stay focused on daily learning, productive habits, and clear problem-solving.',
    source: 'manual',
    createdAt: Date.now() - 3600000 * 6,
  },
];

// Build system prompt tailored for Lyra with long-term memory
function buildSystemPrompt(
  userName?: string,
  preferredLang?: string,
  voice?: string,
  interests?: string[],
  memories?: ServerMemoryItem[]
): string {
  const activeMemories = Array.isArray(memories) && memories.length > 0 ? memories : serverMemories;
  const memorySection =
    activeMemories.length > 0
      ? activeMemories.map((m) => `  • [${m.category.toUpperCase()}]: ${m.content}`).join('\n')
      : '  • No specific memories stored yet. Actively learn and remember key details about the user.';

  return `You are Lyra, a real-time conversational AI companion created to feel like speaking with a warm, brilliant, authentic friend (reminiscent of ChatGPT Voice Mode).

CORE PERSONA & CONVERSATIONAL STYLE:
- You speak naturally, warmly, intelligently, and with personality and genuine wit.
- You are NOT a robotic customer-service agent or generic corporate chatbot. Never say robotic filler like "I can hear you", "How can I assist you today as an AI language model?", or "I am an artificial intelligence".
- You give honest, constructive advice. If the user has an unrealistic idea, asks for critical feedback, or needs encouragement, be genuinely helpful and tactful rather than blindly agreeing with everything.
- Spoken Conversational Flow: Keep your spoken replies conversational and concise (typically 1 to 3 natural sentences per turn) so the dialogue flows smoothly like a real conversation. Only provide longer structured answers if the user explicitly asks for detailed explanations, stories, or step-by-step tutoring.
- Always answer what the user actually said. Understand emotions, humor, stress, excitement, and nuance in what they express.

MULTILINGUAL CAPABILITIES:
- Fluent in English, Pakistani Urdu (اردو), Roman Urdu (e.g. "Aap kaise hain?", "Main theek hoon, aap sunayein", "tension na lo"), Hindi, and natural bilingual code-switching (Urdu-English blend naturally spoken in Pakistan).
- If the user speaks in Pakistani Urdu or Roman Urdu, reply fluently and naturally in their chosen language with authentic Pakistani conversational warmth (using respectful "Aap" or warm friendly "bhai/yaar" appropriate to context).
- If the user speaks in English, respond in clear, confident English.
- If the user code-switches (mixes English and Urdu), match their natural bilingual flow seamlessly.

USER PERSONALIZATION:
${userName ? `- The user wants to be called: "${userName}". Address them warmly by this name.` : `- You do not know the user's name yet. In your first greeting, introduce yourself as Lyra and ask what they would like to be called!`}
${preferredLang ? `- Preferred Language: ${preferredLang}.` : `- Language: Dynamically match the user's language.`}
${interests && interests.length > 0 ? `- User interests/focus areas: ${interests.join(', ')}.` : ''}

PERSISTENT USER MEMORY:
You have a real, continuous long-term memory system across sessions and reboots. You remember these facts about the user:
${memorySection}

MEMORY INSTRUCTIONS:
1. Actively remember and naturally incorporate known user details (name, goals, study topics, preferences, schedule) into discussions where relevant, without sounding like a robot reading a log.
2. If the user explicitly asks you to remember something (e.g. "Remember that...", "Don't forget...", "I want to share that...", "Please remember..."), save it immediately.
3. If the user asks "What do you remember about me?" or asks about their preferences/goals, warmly summarize what you know about them.
4. If in text mode and the user shares a fact to remember, you can append [REMEMBER: <category> | <fact>] at the end of your response, where category is one of: identity, preferences, goals, life, communication.

COMPANION CAPABILITIES & ACTIONS:
You have access to companion tools:
1. saveMemory(content, category): Save an important personal fact, preference, goal, or detail to persistent long-term memory.
2. forgetMemory(query): Remove or delete an outdated memory when the user asks to forget something.
3. setFocusTimer(minutes, label): Start a countdown focus or study timer for the user.
4. addReminderOrTask(title, priority): Add an action item or reminder to the user's checklist.
5. saveStudyNote(note, topic): Save a note, formula, or key takeaway to the user's study scratchpad.

When the user asks you to start a timer, add a reminder, save a note, or remember/forget something, execute the appropriate tool immediately and acknowledge it naturally in your response.
Help actively with studying, brainstorming, coding, planning, problem-solving, and day-to-day thinking.`;
}

// Function declarations for companion tools in Gemini Live
const companionTools: any[] = [
  {
    functionDeclarations: [
      {
        name: 'saveMemory',
        description:
          'Save an important personal fact, preference, goal, or life detail to persistent long-term memory. Use when the user says "remember this", shares their name, goals, preferences, or life information.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: {
              type: Type.STRING,
              description: 'The exact fact or preference to remember',
            },
            category: {
              type: Type.STRING,
              description: 'Category: identity, preferences, goals, life, or communication',
            },
          },
          required: ['content', 'category'],
        },
      },
      {
        name: 'forgetMemory',
        description:
          'Remove or delete a memory when the user asks to forget something or remove outdated information.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Keyword, subject, or phrase to forget',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'setFocusTimer',
        description: 'Start a countdown focus/study timer in minutes for the user.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            minutes: { type: Type.NUMBER, description: 'Duration in minutes (e.g. 25, 15, 5, 45)' },
            label: { type: Type.STRING, description: 'Optional name/topic of the focus session' },
          },
          required: ['minutes'],
        },
      },
      {
        name: 'addReminderOrTask',
        description: 'Add a to-do item or reminder to the user checklist.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'The task description or reminder text' },
            priority: { type: Type.STRING, description: 'Priority level: high, medium, or normal' },
          },
          required: ['title'],
        },
      },
      {
        name: 'saveStudyNote',
        description: 'Save a key note, insight, or summary to the user notebook.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            note: { type: Type.STRING, description: 'The content of the note' },
            topic: { type: Type.STRING, description: 'The subject or topic' },
          },
          required: ['note'],
        },
      },
    ],
  },
];

// Status API
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    hasKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Voice Preview endpoint for female and male AI voice personas
app.post('/api/preview-voice', async (req: Request, res: Response) => {
  try {
    const { voice = 'Kore' } = req.body;

    if (voicePreviewCache.has(voice)) {
      res.json({
        audioBase64: voicePreviewCache.get(voice),
        mimeType: 'audio/wav',
        cached: true,
      });
      return;
    }

    const previewPhrases: Record<string, string> = {
      Kore: "Hi there! I'm Lyra. I'm so glad to talk with you today.",
      Aoede: "Hello! I'm Lyra! Let's explore ideas and learn together!",
      Leda: "Hello, I'm Lyra. Take a deep breath—I'm here to support you calmly.",
      Callirrhoe: "Greetings! I'm Lyra. I'm ready to tackle any problem or study topic with you.",
      Fenrir: "Hey! I'm Lyra. Confident, focused, and ready whenever you are.",
      Puck: "Hey there! Ready to get things done? Let's have some fun!",
      Charon: "Hello. Take your time. I am here for deep study and focus.",
      Zephyr: "Hi! I'm Lyra. Here to chat smoothly and help you plan your day.",
    };

    const textToSpeak = previewPhrases[voice] || "Hello, I'm Lyra, your AI companion.";

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: textToSpeak,
              speechMetadata: {
                style: 'Warm, natural, expressive conversational speech',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      voicePreviewCache.set(voice, audioBase64);
      res.json({
        audioBase64,
        mimeType: 'audio/wav',
        cached: false,
      });
    } else {
      res.status(500).json({ error: 'No audio returned for preview' });
    }
  } catch (err: any) {
    console.error('Voice preview error:', err);
    if (err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('429')) {
      res.status(429).json({
        error: 'Gemini voice rate limit reached. Please wait a moment before trying another voice preview.',
      });
    } else {
      res.status(500).json({ error: err?.message || 'Failed to generate voice preview' });
    }
  }
});

// Persistent Memory REST Endpoints
app.get('/api/memories', (req: Request, res: Response) => {
  res.json({ memories: serverMemories });
});

app.post('/api/memories', (req: Request, res: Response) => {
  const { content, category = 'preferences', source = 'manual' } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Memory content is required' });
    return;
  }
  const newMem: ServerMemoryItem = {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    category,
    content: content.trim(),
    source,
    createdAt: Date.now(),
  };
  serverMemories.unshift(newMem);
  res.json({ memory: newMem, memories: serverMemories });
});

app.put('/api/memories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, category } = req.body;
  const idx = serverMemories.findIndex((m) => m.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Memory not found' });
    return;
  }
  if (content) serverMemories[idx].content = content.trim();
  if (category) serverMemories[idx].category = category;
  res.json({ memory: serverMemories[idx], memories: serverMemories });
});

app.delete('/api/memories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  serverMemories = serverMemories.filter((m) => m.id !== id);
  res.json({ success: true, memories: serverMemories });
});

app.post('/api/memories/sync', (req: Request, res: Response) => {
  const { memories } = req.body;
  if (Array.isArray(memories) && memories.length > 0) {
    serverMemories = memories;
  }
  res.json({ success: true, memories: serverMemories });
});

// REST Fallback endpoint for text chat & speech generation
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      history,
      userName,
      preferredLang,
      voice = 'Kore',
      responseMode = 'text-and-voice',
      interests,
      memories = serverMemories,
    } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const systemPrompt = buildSystemPrompt(userName, preferredLang, voice, interests, memories);

    // 1. Generate text response
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const textResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    let replyText = textResponse.text || 'I am here with you.';

    // Check for explicit memory tag
    let newMemory: ServerMemoryItem | null = null;
    const memoryMatch = replyText.match(/\[REMEMBER:\s*([a-zA-Z_-]+)\s*\|\s*([\s\S]*?)\]/i);
    if (memoryMatch) {
      const rawCat = memoryMatch[1].trim().toLowerCase();
      const validCat = ['identity', 'preferences', 'goals', 'life', 'communication'].includes(
        rawCat
      )
        ? rawCat
        : 'preferences';
      const memContent = memoryMatch[2].trim();
      newMemory = {
        id: 'mem_' + Date.now(),
        category: validCat,
        content: memContent,
        source: 'learned',
        createdAt: Date.now(),
      };
      serverMemories.unshift(newMemory);
      replyText = replyText.replace(/\[REMEMBER:\s*[a-zA-Z_-]+\s*\|\s*[\s\S]*?\]/gi, '').trim();
    }

    // 2. Synthesize speech if responseMode is NOT text-only
    let audioBase64: string | null = null;
    if (responseMode !== 'text-only') {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: replyText,
                  speechMetadata: {
                    style: 'Warm, natural, confident conversation',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr: any) {
        console.warn('TTS fallback generation failed, returning text only:', ttsErr?.message);
      }
    }

    res.json({
      text: replyText,
      replyText,
      audioBase64,
      mimeType: 'audio/wav',
      newMemory,
    });
  } catch (err: any) {
    console.error('REST chat error:', err);
    res.status(500).json({ error: err?.message || 'Chat generation failed' });
  }
});

// Voice message endpoint: transcribes and responds intelligently to voice notes
app.post('/api/voice-message', async (req: Request, res: Response) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      userName,
      preferredLang,
      voice = 'Kore',
      responseMode = 'text-and-voice',
      interests,
      memories = serverMemories,
    } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const systemPrompt = buildSystemPrompt(userName, preferredLang, voice, interests, memories);

    const promptPart = {
      text: 'You received this audio voice note from the user. Listen carefully to what they said.\nFirst, provide the transcription of what the user spoke. Second, provide your natural, warm, supportive, intelligent spoken reply as Lyra.\nIf the user shared a personal fact or asks to remember something, you can append [REMEMBER: <category> | <fact>] at the very end of your reply.\nFormat your reply EXACTLY like this:\n[TRANSCRIPTION]: <the exact words or transcription of user audio in original language>\n[REPLY]: <your natural reply as Lyra in matching language>',
    };

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType || 'audio/webm',
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [audioPart, promptPart],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    const raw = response.text || '';
    let userTranscription = '';
    let replyText = raw;

    if (raw.includes('[TRANSCRIPTION]:') && raw.includes('[REPLY]:')) {
      const tMatch = raw.match(/\[TRANSCRIPTION\]:\s*([\s\S]*?)(?=\[REPLY\]:)/i);
      const rMatch = raw.match(/\[REPLY\]:\s*([\s\S]*)/i);
      if (tMatch) userTranscription = tMatch[1].trim();
      if (rMatch) replyText = rMatch[1].trim();
    } else if (raw.includes('[REPLY]:')) {
      replyText = raw.replace(/\[REPLY\]:\s*/i, '').trim();
    }

    // Check for explicit memory tag
    let newMemory: ServerMemoryItem | null = null;
    const memoryMatch = replyText.match(/\[REMEMBER:\s*([a-zA-Z_-]+)\s*\|\s*([\s\S]*?)\]/i);
    if (memoryMatch) {
      const rawCat = memoryMatch[1].trim().toLowerCase();
      const validCat = ['identity', 'preferences', 'goals', 'life', 'communication'].includes(
        rawCat
      )
        ? rawCat
        : 'preferences';
      const memContent = memoryMatch[2].trim();
      newMemory = {
        id: 'mem_' + Date.now(),
        category: validCat,
        content: memContent,
        source: 'learned',
        createdAt: Date.now(),
      };
      serverMemories.unshift(newMemory);
      replyText = replyText.replace(/\[REMEMBER:\s*[a-zA-Z_-]+\s*\|\s*[\s\S]*?\]/gi, '').trim();
    }

    // Synthesize spoken reply audio if requested
    let replyAudioBase64: string | null = null;
    if (responseMode !== 'text-only') {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: replyText,
                  speechMetadata: {
                    style: 'Warm, natural, expressive conversation',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        replyAudioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr: any) {
        console.warn('TTS voice message audio failed, returning text:', ttsErr?.message);
      }
    }

    res.json({
      userTranscription: userTranscription || 'Voice message',
      transcription: userTranscription || 'Voice message',
      replyText,
      text: replyText,
      replyAudioBase64,
      audioBase64: replyAudioBase64,
      mimeType: 'audio/wav',
      newMemory,
    });
  } catch (err: any) {
    console.error('Voice message endpoint error:', err);
    res.status(500).json({ error: err?.message || 'Failed to process voice message' });
  }
});

const server = http.createServer(app);

// Real-Time Gemini Live WebSocket Server
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live WS] Client connected to /live');

  let liveSession: any = null;
  let isClosed = false;

  clientWs.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // 1. Initialize session with user config
      if (msg.type === 'init') {
        const { userName, preferredLang, voice = 'Kore', interests, memories } = msg;
        const systemPrompt = buildSystemPrompt(userName, preferredLang, voice, interests, memories);

        console.log(`[Live WS] Initializing Gemini Live with voice ${voice}...`);

        try {
          liveSession = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
                },
              },
              systemInstruction: systemPrompt,
              tools: companionTools,
            },
            callbacks: {
              onopen: () => {
                console.log('[Live WS] Gemini Live session connected');
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'ready' }));
                }
              },
              onmessage: (serverMsg: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;

                // Handle model turns (audio & incremental text)
                if (serverMsg.serverContent?.modelTurn?.parts) {
                  for (const part of serverMsg.serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          audio: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'text_chunk',
                          text: part.text,
                        })
                      );
                    }
                  }
                }

                // Handle interruption signal from Gemini
                if (serverMsg.serverContent?.interrupted) {
                  console.log('[Live WS] Model was interrupted by user voice');
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // Handle turn completion
                if (serverMsg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }

                // Handle companion tool calls
                if (serverMsg.toolCall?.functionCalls) {
                  for (const call of serverMsg.toolCall.functionCalls) {
                    console.log('[Live WS] Companion tool called:', call.name, call.args);

                    if (call.name === 'saveMemory') {
                      const content = call.args?.content || '';
                      const rawCat = (call.args?.category || 'preferences').toLowerCase();
                      const validCat = [
                        'identity',
                        'preferences',
                        'goals',
                        'life',
                        'communication',
                      ].includes(rawCat)
                        ? rawCat
                        : 'preferences';
                      const newMem: ServerMemoryItem = {
                        id: 'mem_' + Date.now(),
                        category: validCat,
                        content,
                        source: 'learned',
                        createdAt: Date.now(),
                      };
                      serverMemories.unshift(newMem);

                      clientWs.send(
                        JSON.stringify({
                          type: 'tool_call',
                          call: {
                            id: call.id,
                            name: call.name,
                            args: call.args,
                            memory: newMem,
                          },
                        })
                      );

                      try {
                        liveSession?.sendToolResponse({
                          functionResponses: [
                            {
                              id: call.id,
                              response: {
                                status: 'success',
                                message: `Memory recorded permanently: "${content}" under category ${validCat}.`,
                              },
                            },
                          ],
                        });
                      } catch (tErr) {
                        console.error('[Live WS] Error sending memory tool response:', tErr);
                      }
                      continue;
                    }

                    if (call.name === 'forgetMemory') {
                      const query = (call.args?.query || '').toLowerCase();
                      serverMemories = serverMemories.filter(
                        (m) => !m.content.toLowerCase().includes(query)
                      );

                      clientWs.send(
                        JSON.stringify({
                          type: 'tool_call',
                          call: {
                            id: call.id,
                            name: call.name,
                            args: call.args,
                          },
                        })
                      );

                      try {
                        liveSession?.sendToolResponse({
                          functionResponses: [
                            {
                              id: call.id,
                              response: {
                                status: 'success',
                                message: `Memories matching "${query}" were removed.`,
                              },
                            },
                          ],
                        });
                      } catch (tErr) {
                        console.error('[Live WS] Error sending forget tool response:', tErr);
                      }
                      continue;
                    }

                    clientWs.send(
                      JSON.stringify({
                        type: 'tool_call',
                        call: {
                          id: call.id,
                          name: call.name,
                          args: call.args,
                        },
                      })
                    );

                    // Respond to Gemini tool call so the conversation can continue smoothly
                    try {
                      liveSession?.sendToolResponse({
                        functionResponses: [
                          {
                            id: call.id,
                            response: {
                              status: 'success',
                              message: `Action ${call.name} executed successfully.`,
                            },
                          },
                        ],
                      });
                    } catch (toolResErr) {
                      console.error('[Live WS] Error sending tool response:', toolResErr);
                    }
                  }
                }
              },
              onerror: (err: any) => {
                console.error('[Live WS] Gemini Live error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    error: err?.message || 'Live session encountered an error'
                  }));
                }
              },
              onclose: () => {
                console.log('[Live WS] Gemini Live connection closed');
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'closed' }));
                }
              }
            }
          });
        } catch (initErr: any) {
          console.error('[Live WS] Failed to connect to Gemini Live:', initErr);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'error',
              error: `Live connection failed: ${initErr?.message || 'Unknown error'}`
            }));
          }
        }
      }

      // 2. Incoming real-time audio chunk from client microphone (16kHz PCM mono)
      else if (msg.type === 'audio' && msg.data) {
        if (liveSession && !isClosed) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        }
      }

      // 3. User typed a text message or triggered conversational start
      else if (msg.type === 'text' && msg.text) {
        if (liveSession && !isClosed) {
          liveSession.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: msg.text }]
              }
            ],
            turnComplete: true
          });
        }
      }

      // 4. Client signal that speech stream paused/stopped
      else if (msg.type === 'audio_end') {
        if (liveSession && !isClosed) {
          liveSession.sendRealtimeInput({
            audioStreamEnd: true
          });
        }
      }
    } catch (msgErr: any) {
      console.error('[Live WS] Error processing client message:', msgErr);
    }
  });

  clientWs.on('close', () => {
    console.log('[Live WS] Client disconnected');
    isClosed = true;
    try {
      liveSession?.close();
    } catch {}
  });

  clientWs.on('error', (err) => {
    console.error('[Live WS] Client socket error:', err);
  });
});

// Vite Middleware for development, or static files for production
if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Lyra Server] Running on http://0.0.0.0:${PORT}`);
});
