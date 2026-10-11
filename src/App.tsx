/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CompanionState,
  UserSettings,
  Message,
  TaskItem,
  StudyNote,
  FocusTimerState,
  AVAILABLE_LANGUAGES,
  AppTheme,
  RobotLayoutMode,
  MemoryItem,
  MemoryCategory,
  DEFAULT_MEMORIES,
} from './types/companion';
import { LiveAudioClient } from './services/liveAudioClient';
import { LyraAvatar } from './components/LyraAvatar';
import { AudioVisualizer } from './components/AudioVisualizer';
import { Header } from './components/Header';
import { ConversationDrawer } from './components/ConversationDrawer';
import { CompanionToolsDrawer } from './components/CompanionToolsDrawer';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { DesktopInstallModal } from './components/DesktopInstallModal';
import { MemoryModal } from './components/MemoryModal';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Clock,
  Sparkles,
  AlertCircle,
  Laptop,
  Image as ImageIcon,
  Heart,
  Layout,
  Brain,
} from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';


async function readJsonResponse(response: Response): Promise<any> {
  const raw = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    try { data = JSON.parse(raw); } catch {
      throw new Error(`Lyra API returned malformed JSON (HTTP ${response.status}). Please check the Vercel function logs.`);
    }
  } else {
    const detail = raw.trim().startsWith('<') || /<!doctype html/i.test(raw)
      ? 'Vercel returned an HTML page instead of JSON. The API route may be missing or the deployment may still be building.'
      : (raw.slice(0, 180) || 'The API returned an empty response.');
    throw new Error(`${detail} (HTTP ${response.status}).`);
  }
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Lyra API request failed (HTTP ${response.status}).`);
  }
  return data;
}

const STORAGE_KEY_SETTINGS = 'lyra_user_settings';
const STORAGE_KEY_TASKS = 'lyra_tasks';
const STORAGE_KEY_NOTES = 'lyra_notes';
const STORAGE_KEY_MESSAGES = 'lyra_messages';
const STORAGE_KEY_MEMORIES = 'lyra_user_memories';

const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  preferredLanguage: 'auto',
  voice: 'Kore',
  theme: 'pink-night',
  responseMode: 'text-and-voice',
  robotLayout: 'center',
  wallpaper: {
    url: null,
    brightness: 35,
    blur: 0,
  },
  customTheme: {
    bgMode: 'dark',
    accentColor: '#f472b6',
  },
  interests: ['Studies & Problem Solving', 'Everyday Productivity', 'Multilingual Urdu & English'],
  onboardingCompleted: false,
};

export default function App() {
  // Settings & Onboarding
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          voice: parsed.voice || 'Kore',
          theme: parsed.theme || 'pink-night',
          robotLayout: parsed.robotLayout || 'center',
          wallpaper: parsed.wallpaper || DEFAULT_SETTINGS.wallpaper,
          customTheme: parsed.customTheme || DEFAULT_SETTINGS.customTheme,
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Track system dark mode preference as fallback
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute active theme & dark mode state
  const isNight =
    settings.theme === 'pink-night' ||
    settings.theme === 'midnight' ||
    (settings.theme === 'custom' && settings.customTheme?.bgMode !== 'light') ||
    (settings.theme as string === 'night');

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!settings.onboardingCompleted);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isDesktopInstallOpen, setIsDesktopInstallOpen] = useState(false);
  const [memoryToast, setMemoryToast] = useState<{ content: string; category: string } | null>(null);

  // Companion Voice State
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveSubtitle, setLiveSubtitle] = useState('');

  // Conversation History
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Long-Term Memories
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMORIES);
      return saved ? JSON.parse(saved) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });

  // Companion Tasks & Reminders
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: '1',
              title: 'Welcome to Lyra! Ask anything in Urdu, Roman Urdu, or English',
              completed: false,
              priority: 'normal',
              createdAt: Date.now(),
            },
          ];
    } catch {
      return [];
    }
  });

  // Study Notes Scratchpad
  const [notes, setNotes] = useState<StudyNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Focus Timer
  const [timer, setTimer] = useState<FocusTimerState>({
    isRunning: false,
    durationMinutes: 25,
    remainingSeconds: 25 * 60,
    label: 'Focus Session',
  });

  // PWA Install Hook for Windows Desktop
  const { isInstallable, isInstalled } = usePWAInstall();

  // Client references
  const liveClientRef = useRef<LiveAudioClient | null>(null);
  const currentTurnTranscriptRef = useRef('');

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // Sync HTML meta theme-color with active theme
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color =
        settings.theme === 'pink-night'
          ? '#08080c'
          : settings.theme === 'midnight'
          ? '#040711'
          : settings.theme === 'soft-pink'
          ? '#fdf2f8'
          : settings.theme === 'day'
          ? '#ffffff'
          : '#111827';
      metaThemeColor.setAttribute('content', color);
    }
  }, [settings.theme]);

  // Focus Timer interval ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer.isRunning && timer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev.remainingSeconds <= 1) {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            } catch {}

            return {
              ...prev,
              isRunning: false,
              remainingSeconds: 0,
            };
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.remainingSeconds]);

  // Handle companion tool execution triggered by Gemini Live
  const handleToolExecution = useCallback((call: { id: string; name: string; args: any }) => {
    console.log('[App] Executing tool call:', call.name, call.args);

    if (call.name === 'setFocusTimer') {
      const minutes = call.args?.minutes || 25;
      const label = call.args?.label || 'Focus Session';
      setTimer({
        isRunning: true,
        durationMinutes: minutes,
        remainingSeconds: minutes * 60,
        label,
      });
      setIsToolsOpen(true);
    } else if (call.name === 'addReminderOrTask') {
      const title = call.args?.title;
      if (title) {
        const priority = call.args?.priority || 'normal';
        setTasks((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            title,
            completed: false,
            priority,
            createdAt: Date.now(),
          },
        ]);
        setIsToolsOpen(true);
      }
    } else if (call.name === 'saveStudyNote') {
      const note = call.args?.note;
      if (note) {
        const topic = call.args?.topic || 'General Note';
        setNotes((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            topic,
            note,
            createdAt: Date.now(),
          },
        ]);
        setIsToolsOpen(true);
      }
    } else if (call.name === 'saveMemory') {
      const content = call.args?.content;
      if (content) {
        const rawCat = (call.args?.category || 'preferences').toLowerCase();
        const validCat = ['identity', 'preferences', 'goals', 'life', 'communication'].includes(
          rawCat
        )
          ? (rawCat as MemoryCategory)
          : 'preferences';
        const newMem: MemoryItem = {
          id: 'mem_' + Date.now(),
          category: validCat,
          content,
          source: 'learned',
          createdAt: Date.now(),
        };
        setMemories((prev) => [newMem, ...prev.filter((m) => m.content !== content)]);
        setMemoryToast({ content, category: validCat });
        setTimeout(() => setMemoryToast(null), 4500);
      }
    } else if (call.name === 'forgetMemory') {
      const query = (call.args?.query || '').toLowerCase();
      if (query) {
        setMemories((prev) => prev.filter((m) => !m.content.toLowerCase().includes(query)));
      }
    }
  }, []);

  // Initialize and start live voice conversation
  const startLiveConversation = async () => {
    setErrorMessage(null);

    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    const client = new LiveAudioClient({
      onStateChange: (newState) => {
        setCompanionState(newState);
        if (newState === 'listening') {
          setTimeout(() => {
            setLiveSubtitle('');
          }, 3500);
        }
      },
      onTranscriptChunk: (chunk, sender) => {
        currentTurnTranscriptRef.current += chunk;
        setLiveSubtitle((prev) => prev + chunk);
      },
      onTurnComplete: () => {
        const fullText = currentTurnTranscriptRef.current.trim();
        if (fullText) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'lyra',
              text: fullText,
              timestamp: Date.now(),
              status: 'read',
            },
          ]);
          currentTurnTranscriptRef.current = '';
        }
      },
      onInterrupted: () => {
        console.log('[App] Lyra interrupted by user speech');
        currentTurnTranscriptRef.current = '';
        setLiveSubtitle('Listening...');
      },
      onToolCall: (call) => {
        handleToolExecution(call);
      },
      onError: (err) => {
        console.error('[App] Voice client error:', err);
        if (err.includes('429') || err.includes('quota') || err.includes('RESOURCE_EXHAUSTED')) {
          setErrorMessage(
            'Google Gemini provider rate limit reached. Reconnecting momentarily...'
          );
        } else {
          setErrorMessage(err);
        }
      },
      onInputVolume: (vol) => setInputVolume(vol),
      onOutputVolume: (vol) => setOutputVolume(vol),
    });

    liveClientRef.current = client;

    try {
      await client.connect(settings, memories);
    } catch (err: any) {
      console.error('[App] Failed to start conversation:', err);
    }
  };

  const endLiveConversation = () => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setCompanionState('idle');
    setInputVolume(0);
    setOutputVolume(0);
    setLiveSubtitle('');
    currentTurnTranscriptRef.current = '';
  };

  const toggleCall = () => {
    if (companionState === 'idle' || companionState === 'error') {
      startLiveConversation();
    } else {
      endLiveConversation();
    }
  };

  const toggleMute = () => {
    if (!liveClientRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    liveClientRef.current.setMute(nextMute);
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  // Send message via text
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: Date.now(),
      status: 'read',
    };
    setMessages((prev) => [...prev, userMsg]);

    if (liveClientRef.current && companionState !== 'idle' && companionState !== 'error') {
      liveClientRef.current.sendText(text);
      return;
    }

    // Otherwise use REST fallback
    setCompanionState('thinking');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5),
          userName: settings.userName,
          preferredLang: settings.preferredLanguage,
          voice: settings.voice,
          responseMode: settings.responseMode,
          interests: settings.interests,
          memories,
        }),
      });

      const data = await readJsonResponse(res);
      if (data.error) throw new Error(data.error);

      if (data.newMemory) {
        setMemories((prev) => [
          data.newMemory,
          ...prev.filter((m) => m.content !== data.newMemory.content),
        ]);
        setMemoryToast({
          content: data.newMemory.content,
          category: data.newMemory.category,
        });
        setTimeout(() => setMemoryToast(null), 4500);
      }

      const replyText = data.replyText || data.text || 'I am here with you.';
      const replyAudio = data.replyAudioBase64 || data.audioBase64;

      const lyraReplyMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'lyra',
        text: replyText,
        timestamp: Date.now(),
        audioBase64: replyAudio,
        audioMimeType: data.mimeType || 'audio/wav',
        status: 'read',
      };

      setMessages((prev) => [...prev, lyraReplyMsg]);
      setLiveSubtitle(replyText);
      setCompanionState('speaking');

      if (replyAudio) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${replyAudio}`);
        audio.onended = () => {
          setCompanionState('idle');
        };
        await audio.play();
      } else {
        setTimeout(() => setCompanionState('idle'), 2500);
      }
    } catch (err: any) {
      console.error('[App] REST chat error:', err);
      setErrorMessage(err.message || 'Failed to get response');
      setCompanionState('idle');
    }
  };

  // Send message via WhatsApp-style Voice Note
  const handleSendVoiceNote = async (
    audioBase64: string,
    mimeType: string,
    duration: number
  ) => {
    const userVoiceMsgId = Date.now().toString();
    const userVoiceMsg: Message = {
      id: userVoiceMsgId,
      sender: 'user',
      text: '🎤 Voice message',
      timestamp: Date.now(),
      audioBase64,
      audioMimeType: mimeType,
      audioDuration: duration,
      isVoiceNote: true,
      status: 'read',
    };

    setMessages((prev) => [...prev, userVoiceMsg]);
    setCompanionState('thinking');

    try {
      const res = await fetch('/api/voice-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          userName: settings.userName,
          preferredLang: settings.preferredLanguage,
          voice: settings.voice,
          responseMode: settings.responseMode,
          interests: settings.interests,
          memories,
        }),
      });

      const data = await readJsonResponse(res);
      if (data.error) throw new Error(data.error);

      if (data.newMemory) {
        setMemories((prev) => [
          data.newMemory,
          ...prev.filter((m) => m.content !== data.newMemory.content),
        ]);
        setMemoryToast({
          content: data.newMemory.content,
          category: data.newMemory.category,
        });
        setTimeout(() => setMemoryToast(null), 4500);
      }

      // If user transcription was returned, update user message text
      const userTranscription = data.userTranscription || data.transcription;
      if (userTranscription) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userVoiceMsgId ? { ...m, text: `🎤 ${userTranscription}` } : m
          )
        );
      }

      const replyText = data.replyText || data.text || 'Voice reply received.';
      const replyAudio = data.replyAudioBase64 || data.audioBase64;

      const lyraVoiceReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'lyra',
        text: replyText,
        timestamp: Date.now(),
        audioBase64: replyAudio,
        audioMimeType: data.mimeType || 'audio/wav',
        isVoiceNote: !!replyAudio,
        status: 'read',
      };

      setMessages((prev) => [...prev, lyraVoiceReply]);
      setLiveSubtitle(replyText);
      setCompanionState('speaking');

      if (replyAudio) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${replyAudio}`);
        audio.onended = () => {
          setCompanionState('idle');
        };
        await audio.play();
      } else {
        setTimeout(() => setCompanionState('idle'), 2500);
      }
    } catch (err: any) {
      console.error('[App] Voice message processing error:', err);
      setErrorMessage(err?.message || 'Failed to process voice note');
      setCompanionState('idle');
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  };

  // Memory Management Handlers
  const handleAddMemory = async (content: string, category: MemoryCategory) => {
    const newMem: MemoryItem = {
      id: 'mem_' + Date.now(),
      category,
      content,
      source: 'manual',
      createdAt: Date.now(),
    };
    setMemories((prev) => [newMem, ...prev]);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category }),
      });
    } catch (err) {
      console.warn('Could not sync memory to server:', err);
    }
  };

  const handleUpdateMemory = async (
    id: string,
    content: string,
    category: MemoryCategory
  ) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content, category, updatedAt: Date.now() } : m))
    );
    try {
      await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category }),
      });
    } catch (err) {
      console.warn('Could not sync memory update to server:', err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Could not delete memory from server:', err);
    }
  };

  const handleClearAllMemories = () => {
    setMemories([]);
    localStorage.removeItem(STORAGE_KEY_MEMORIES);
  };

  const handleSyncWithServer = async () => {
    try {
      const res = await fetch('/api/memories/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories }),
      });
      const data = await readJsonResponse(res);
      if (data.memories && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.warn('Failed to sync memories:', err);
    }
  };

  // State status badge label
  const getStatusBadge = () => {
    switch (companionState) {
      case 'listening':
        return {
          text: 'Listening to your voice...',
          color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
        };
      case 'thinking':
        return {
          text: 'Thinking & analyzing...',
          color: 'text-amber-300 bg-amber-950/60 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        };
      case 'speaking':
        return {
          text: 'Lyra is speaking...',
          color:
            settings.theme === 'pink-night'
              ? 'text-pink-300 bg-[#1e1022] border-pink-400/50 shadow-[0_0_14px_rgba(244,114,182,0.25)]'
              : settings.theme === 'midnight'
              ? 'text-amber-300 bg-[#162248] border-amber-400/40 shadow-[0_0_14px_rgba(251,191,36,0.2)]'
              : 'text-indigo-700 bg-indigo-50 border-indigo-200',
        };
      case 'muted':
        return {
          text: 'Microphone Muted',
          color: 'text-rose-300 bg-rose-950/60 border-rose-500/40',
        };
      case 'happy':
        return {
          text: 'Lyra is delighted! 💖',
          color: 'text-pink-300 bg-pink-950/60 border-pink-500/40 shadow-[0_0_14px_rgba(244,114,182,0.3)]',
        };
      case 'connecting':
        return {
          text: 'Connecting to Gemini Live...',
          color: 'text-pink-400 bg-black/40 border-pink-400/30',
        };
      case 'error':
        return {
          text: 'Connection Error',
          color: 'text-rose-300 bg-rose-950/60 border-rose-500/40',
        };
      default:
        return {
          text: 'Ready to Talk',
          color: isNight
            ? 'text-slate-300 bg-black/40 border-white/10'
            : 'text-slate-700 bg-slate-100 border-slate-200',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const currentLang =
    AVAILABLE_LANGUAGES.find((l) => l.id === settings.preferredLanguage) ||
    AVAILABLE_LANGUAGES[0];

  // Theme styling helpers
  const isPinkNight = settings.theme === 'pink-night';
  const isMidnight = settings.theme === 'midnight';
  const isSoftPink = settings.theme === 'soft-pink';
  const isDay = settings.theme === 'day';
  const hasCustomWallpaper = Boolean(settings.wallpaper?.url);

  // Background styling calculation
  const getAppBackgroundStyle = (): React.CSSProperties => {
    if (hasCustomWallpaper && settings.wallpaper?.url) {
      return {
        backgroundImage: `url(${settings.wallpaper.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }

    if (isPinkNight) {
      return {
        backgroundColor: '#08080c',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(244, 114, 182, 0.12) 0%, transparent 65%)',
      };
    }

    if (isMidnight) {
      return {
        backgroundColor: '#040711',
        backgroundImage:
          'radial-gradient(circle at 50% 18%, rgba(20, 30, 68, 0.45) 0%, transparent 60%)',
      };
    }

    if (isSoftPink) {
      return {
        backgroundColor: '#fdf2f8',
        backgroundImage:
          'radial-gradient(circle at 50% 18%, rgba(244, 114, 182, 0.18) 0%, transparent 60%)',
      };
    }

    if (isDay) {
      return {
        backgroundColor: '#f8fafc',
      };
    }

    // Custom theme
    if (settings.customTheme?.bgMode === 'light') {
      return { backgroundColor: '#ffffff' };
    }
    return {
      backgroundColor: '#0b0f19',
      backgroundImage: `radial-gradient(circle at 50% 20%, ${settings.customTheme?.accentColor}18 0%, transparent 65%)`,
    };
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-300 relative ${
        isNight ? 'text-slate-100' : 'text-slate-900'
      }`}
      style={getAppBackgroundStyle()}
    >
      {/* Custom Wallpaper Darkening / Blur Overlay to maintain strict text readability */}
      {hasCustomWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-all duration-300"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${(settings.wallpaper?.brightness || 35) / 100})`,
            backdropFilter: `blur(${settings.wallpaper?.blur || 0}px)`,
          }}
        />
      )}

      {/* 1. Header (Strict Top Bar Contract & Multi-Theme Controller) */}
      <Header
        state={companionState}
        onToggleCall={toggleCall}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        onOpenTools={() => setIsToolsOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallDesktop={() => setIsDesktopInstallOpen(true)}
        activeLanguageLabel={currentLang.label}
        theme={settings.theme}
        customTheme={settings.customTheme}
        isNight={isNight}
        hasCustomWallpaper={hasCustomWallpaper}
        memoryCount={memories.length}
        onThemeChange={handleThemeChange}
      />

      {/* Error Alert Banner */}
      {errorMessage && (
        <div
          className={`px-6 py-2.5 flex items-center justify-between text-xs border-b z-20 ${
            isNight
              ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Companion Center Stage */}
      <main className="flex-1 flex flex-col items-center justify-between px-4 py-6 md:py-8 max-w-4xl mx-auto w-full relative z-10">
        {/* Top Status & Context Info */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition-all flex items-center gap-2 ${statusBadge.color}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                companionState === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : companionState === 'speaking'
                  ? isPinkNight
                    ? 'bg-pink-400 animate-pulse'
                    : isMidnight
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-indigo-500 animate-pulse'
                  : companionState === 'thinking'
                  ? 'bg-amber-400'
                  : companionState === 'happy'
                  ? 'bg-pink-400 animate-bounce'
                  : isNight
                  ? 'bg-slate-500'
                  : 'bg-slate-400'
              }`}
            />
            {statusBadge.text}
          </div>

          <div
            className={`text-xs flex items-center gap-2 ${
              isNight ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {settings.userName ? (
              <span>
                Conversing with{' '}
                <strong className={isNight ? 'text-pink-300 font-bold' : 'text-slate-800 font-bold'}>
                  {settings.userName}
                </strong>
              </span>
            ) : (
              <span>Lyra Voice Mode</span>
            )}
            <span>·</span>
            <span>
              Voice:{' '}
              <span
                className={`font-semibold ${
                  isPinkNight
                    ? 'text-pink-400'
                    : isMidnight
                    ? 'text-amber-400'
                    : 'text-indigo-600'
                }`}
              >
                {settings.voice}
              </span>
            </span>
          </div>
        </div>

        {/* Center Character Experience: Center Hero vs Compact Mode */}
        {settings.robotLayout === 'compact' ? (
          /* Compact Dock Mode */
          <div className="my-auto w-full max-w-xl p-6 rounded-3xl border bg-black/30 backdrop-blur-md border-white/10 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-4">
              <LyraAvatar
                state={companionState}
                inputVolume={inputVolume}
                outputVolume={outputVolume}
                theme={settings.theme}
                customTheme={settings.customTheme}
                isNight={isNight}
                compact={true}
                onClick={toggleCall}
              />
              <div className="text-left">
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <span>Lyra Companion</span>
                  <span className="text-pink-400 text-xs">🎀</span>
                </h3>
                <p className="text-xs opacity-70">
                  Compact mode active · Full focus on WhatsApp chat &amp; study tools.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTranscriptOpen(true)}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Open WhatsApp Chat
              </button>
              <button
                onClick={() => setIsToolsOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Study &amp; Tasks
              </button>
            </div>
          </div>
        ) : (
          /* Standard Center Hero Mode */
          <div className="my-auto flex flex-col items-center justify-center relative py-4">
            {/* Adorable Lyra Avatar with responsive states, animated eyes, and audio feedback */}
            <LyraAvatar
              state={companionState}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              theme={settings.theme}
              customTheme={settings.customTheme}
              isNight={isNight}
              compact={false}
              onClick={() => {
                if (companionState === 'idle') {
                  setCompanionState('happy');
                  setTimeout(() => setCompanionState('idle'), 2400);
                } else {
                  toggleCall();
                }
              }}
            />

            {/* Dynamic Frequency Visualizer */}
            <AudioVisualizer
              inputAnalyser={liveClientRef.current?.getInputAnalyser() || null}
              outputAnalyser={liveClientRef.current?.getOutputAnalyser() || null}
              state={companionState}
              theme={settings.theme}
              customTheme={settings.customTheme}
              isNight={isNight}
              className="mt-6"
            />

            {/* Real-time Subtitle Ticker */}
            <div className="min-h-[56px] max-w-lg px-6 mt-4 text-center flex items-center justify-center">
              {liveSubtitle ? (
                <p
                  className={`text-sm md:text-base font-medium leading-relaxed animate-fade-in py-2.5 px-5 rounded-2xl border shadow-xs ${
                    isPinkNight
                      ? 'bg-[#120f18]/90 border-pink-500/30 text-pink-100 shadow-[0_4px_24px_rgba(244,114,182,0.15)]'
                      : isMidnight
                      ? 'bg-[#0a0f24]/90 border-amber-400/30 text-amber-100 shadow-[0_4px_24px_rgba(251,191,36,0.12)]'
                      : 'bg-white/90 border-slate-200 text-slate-800'
                  }`}
                >
                  “{liveSubtitle}”
                </p>
              ) : companionState === 'listening' ? (
                <p className={`text-xs italic ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Listening to your voice... Speak freely in Urdu, Roman Urdu, or English.
                </p>
              ) : companionState === 'happy' ? (
                <p className="text-xs text-pink-300 font-semibold animate-pulse">
                  Lyra is delighted to companion you today! 💖
                </p>
              ) : companionState === 'idle' ? (
                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tap the adorable robot or{' '}
                  <strong
                    className={
                      isPinkNight
                        ? 'text-pink-300 font-semibold'
                        : isMidnight
                        ? 'text-amber-300 font-semibold'
                        : 'text-slate-800 font-semibold'
                    }
                  >
                    Start Voice
                  </strong>{' '}
                  to speak with Lyra.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Quick Language Dial */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-xl shadow-2xs mb-5 border transition-colors ${
            isNight ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setSettings((prev) => ({ ...prev, preferredLanguage: lang.id }));
                if (companionState !== 'idle') {
                  startLiveConversation();
                }
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                settings.preferredLanguage === lang.id
                  ? isPinkNight
                    ? 'bg-pink-500 text-slate-950 font-bold shadow-xs'
                    : isMidnight
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isNight
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">{lang.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Floating Voice & Chat Control Deck (ChatGPT Voice Mode Style) */}
        <div
          className={`w-full max-w-md shadow-2xl rounded-3xl p-3 flex items-center justify-between gap-3 z-20 border transition-all ${
            isPinkNight
              ? 'bg-[#0f0c14]/95 border-pink-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.7)]'
              : isMidnight
              ? 'bg-[#080d1c]/95 border-[#1e2a4a] shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border-slate-200'
          }`}
        >
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            disabled={companionState === 'idle' || companionState === 'error'}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                : isNight
                ? 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 disabled:opacity-40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40'
            }`}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Main Hero Call Toggle */}
          <button
            onClick={toggleCall}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer ${
              companionState !== 'idle' && companionState !== 'error'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/40'
                : isPinkNight
                ? 'bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-300 hover:to-pink-400 text-slate-950 shadow-[0_0_24px_rgba(244,114,182,0.3)]'
                : isMidnight
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
            }`}
          >
            {companionState !== 'idle' && companionState !== 'error' ? (
              <>
                <PhoneOff className="w-5 h-5" />
                End Conversation
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Voice with Lyra
              </>
            )}
          </button>

          {/* Open WhatsApp-Style Transcript Drawer */}
          <button
            onClick={() => setIsTranscriptOpen(true)}
            className={`p-3.5 rounded-2xl transition-colors relative cursor-pointer ${
              isNight
                ? 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Open WhatsApp chat and voice notes"
            title="WhatsApp Chat & Voice Notes"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && (
              <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  isPinkNight ? 'bg-pink-400' : isMidnight ? 'bg-amber-400' : 'bg-indigo-600'
                }`}
              />
            )}
          </button>

          {/* Open Companion Tools (Timer & Tasks) */}
          <button
            onClick={() => setIsToolsOpen(true)}
            className={`p-3.5 rounded-2xl transition-colors relative cursor-pointer ${
              isNight
                ? 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Open study tools and timer"
            title="Study & Focus Tools"
          >
            <Clock className="w-5 h-5" />
            {timer.isRunning && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </main>

      {/* Bottom Quiet Footer */}
      <footer
        className={`py-3 px-6 text-center text-xs border-t transition-colors flex items-center justify-between max-w-4xl mx-auto w-full z-10 ${
          isNight
            ? 'border-white/10 bg-black/30 text-slate-400'
            : 'border-slate-200/80 bg-white/50 text-slate-500'
        }`}
      >
        <span>Lyra AI Companion · Low-Latency Voice · Multilingual</span>
        <button
          onClick={() => setIsDesktopInstallOpen(true)}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
            isPinkNight
              ? 'text-pink-400 hover:text-pink-300'
              : isMidnight
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-indigo-600 hover:text-indigo-800'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>{isInstalled ? 'Installed Desktop App' : 'Install Windows App'}</span>
        </button>
      </footer>

      {/* Side Drawers & Modals */}
      <ConversationDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendVoiceNote={handleSendVoiceNote}
        onClearMessages={handleClearMessages}
        onStartLiveCall={toggleCall}
        isLiveConnected={companionState !== 'idle' && companionState !== 'error'}
        theme={settings.theme}
        customTheme={settings.customTheme}
        isNight={isNight}
      />

      <CompanionToolsDrawer
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        timer={timer}
        onStartTimer={(minutes, label) => {
          setTimer({
            isRunning: true,
            durationMinutes: minutes,
            remainingSeconds: minutes * 60,
            label: label || 'Focus Session',
          });
        }}
        onPauseTimer={() => setTimer((p) => ({ ...p, isRunning: false }))}
        onResumeTimer={() => setTimer((p) => ({ ...p, isRunning: true }))}
        onResetTimer={() =>
          setTimer((p) => ({
            ...p,
            isRunning: false,
            remainingSeconds: p.durationMinutes * 60,
          }))
        }
        tasks={tasks}
        onAddTask={(title, priority) =>
          setTasks((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              title,
              completed: false,
              priority: priority || 'normal',
              createdAt: Date.now(),
            },
          ])
        }
        onToggleTask={(id) =>
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
          )
        }
        onDeleteTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        notes={notes}
        onAddNote={(note, topic) =>
          setNotes((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              topic: topic || 'General',
              note,
              createdAt: Date.now(),
            },
          ])
        }
        onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        memories={memories}
        onOpenMemoryManager={() => setIsMemoryOpen(true)}
        onDeleteMemory={handleDeleteMemory}
        isNight={isNight}
      />

      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        currentSettings={settings}
        isNight={isNight}
        onComplete={(newSettings) => {
          setSettings(newSettings);
          setIsOnboardingOpen(false);
        }}
        onSkip={() => {
          setSettings((prev) => ({ ...prev, onboardingCompleted: true }));
          setIsOnboardingOpen(false);
        }}
      />

      {/* Settings Dialog (Personalization, Themes, Wallpaper, Voices) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        isNight={isNight}
        onClose={() => setIsSettingsOpen(false)}
        onOpenInstallDesktop={() => setIsDesktopInstallOpen(true)}
        onSave={(newSettings) => {
          setSettings(newSettings);
          if (companionState !== 'idle') {
            startLiveConversation();
          }
        }}
      />

      {/* Desktop Windows Install Modal */}
      <DesktopInstallModal
        isOpen={isDesktopInstallOpen}
        onClose={() => setIsDesktopInstallOpen(false)}
        theme={settings.theme}
        isNight={isNight}
      />

      {/* Persistent Long-Term Memory Modal */}
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onAddMemory={handleAddMemory}
        onUpdateMemory={handleUpdateMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearAllMemories={handleClearAllMemories}
        onSyncWithServer={handleSyncWithServer}
        theme={settings.theme}
        customTheme={settings.customTheme}
        isNight={isNight}
      />

      {/* Floating Memory Recorded Toast */}
      {memoryToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md ${
              isNight
                ? 'bg-[#0b1022]/95 border-pink-500/40 text-slate-100 shadow-[0_0_24px_rgba(244,114,182,0.2)]'
                : 'bg-white/95 border-pink-200 text-slate-900 shadow-xl'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-2xs font-bold text-pink-400 uppercase tracking-wider">
                <span>🧠 Lyra Remembered</span>
                <span>•</span>
                <span>{memoryToast.category}</span>
              </div>
              <p className="text-xs font-medium max-w-xs truncate">{memoryToast.content}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMemoryOpen(true)}
              className="ml-1 text-2xs font-semibold px-2 py-1 rounded-lg bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 transition-colors cursor-pointer"
            >
              View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
