import React, { useState, useRef, useEffect } from 'react';
import { Message, AppTheme, CustomThemeConfig } from '../types/companion';
import {
  Send,
  X,
  Copy,
  Check,
  CheckCheck,
  Search,
  Mic,
  MicOff,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  Plus,
  PhoneCall,
  Sparkles,
  Square,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { LyraAvatar } from './LyraAvatar';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendVoiceNote?: (audioBase64: string, mimeType: string, duration: number) => void;
  onClearMessages?: () => void;
  onStartLiveCall?: () => void;
  isLiveConnected: boolean;
  theme?: AppTheme;
  customTheme?: CustomThemeConfig;
  isNight?: boolean;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onSendVoiceNote,
  onClearMessages,
  onStartLiveCall,
  isLiveConnected,
  theme = 'pink-night',
  customTheme,
  isNight = true,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle voice note recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalSecs = recordingSecondsRef.current;
        const chunks = [...audioChunksRef.current];
        stream.getTracks().forEach((track) => track.stop());

        if (finalSecs >= 1 && chunks.length > 0 && onSendVoiceNote) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            if (base64) {
              onSendVoiceNote(base64, 'audio/webm', finalSecs);
            }
          };
        }
        recordingSecondsRef.current = 0;
        setRecordingSeconds(0);
      };

      mediaRecorder.start(250); // slice every 250ms for reliable chunks
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone for voice note:', err);
    }
  };

  const stopRecording = (shouldSave: boolean) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!shouldSave) {
      // Discard recording
      audioChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowQuickPrompts(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const textContent = messages
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleString()}] ${
            m.sender === 'user' ? 'User' : 'Lyra'
          }:\n${m.text}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([textContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyra-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isUrduText = (text: string) => {
    const urduRegex = /[\u0600-\u06FF]/;
    return urduRegex.test(text);
  };

  const quickPrompts = [
    { label: 'Roman Urdu Greeting', text: 'Aap kaisi hain Lyra? Aaj ka kya plan hai?' },
    { label: 'Urdu Study Plan', text: 'مجھے آج کی ٹاسک لسٹ اور اسٹڈی پلان بنانے میں مدد کریں' },
    { label: 'Explain Simple', text: 'Explain how machine learning works like I am 12 years old' },
    { label: 'Focus Timer', text: 'Please start a 25-minute study focus timer for me' },
    { label: 'Exam Advice', text: 'I feel overwhelmed with studies. What is the best practical next step?' },
  ];

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (!isOpen) return null;

  // Theme accent colors
  const isPinkNight = theme === 'pink-night';
  const isMidnight = theme === 'midnight';
  const isSoftPink = theme === 'soft-pink';
  const isDay = theme === 'day';

  let accentHex = '#f472b6';
  if (isPinkNight) accentHex = '#f472b6';
  else if (isMidnight) accentHex = '#fbbf24';
  else if (isSoftPink) accentHex = '#ec4899';
  else if (isDay) accentHex = '#4f46e5';
  else if (customTheme?.accentColor) accentHex = customTheme.accentColor;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 border-l shadow-2xl flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-full md:w-3/4 max-w-5xl' : 'w-full max-w-lg'
      } ${
        isPinkNight
          ? 'bg-[#08080d] border-pink-500/20 text-slate-100'
          : isMidnight
          ? 'bg-[#060a17] border-[#1e2a4a] text-slate-100'
          : isSoftPink
          ? 'bg-[#fff5f8] border-pink-200 text-slate-900'
          : isDay
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#0b0f19] border-slate-800 text-slate-100'
      }`}
    >
      {/* 1. WhatsApp-Style Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b shrink-0 transition-colors ${
          isPinkNight
            ? 'bg-[#0e0c14] border-pink-500/20'
            : isMidnight
            ? 'bg-[#090f22] border-[#1e2a4a]'
            : isSoftPink
            ? 'bg-pink-100/70 border-pink-200'
            : isDay
            ? 'bg-slate-100 border-slate-200'
            : 'bg-[#101726] border-slate-800'
        }`}
      >
        {/* Left: Companion Avatar & Status Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <LyraAvatar
              state={isLiveConnected ? 'listening' : 'idle'}
              inputVolume={0}
              outputVolume={0}
              theme={theme}
              customTheme={customTheme}
              isNight={isNight}
              compact={true}
              onClick={onStartLiveCall}
            />
            {isLiveConnected && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Lyra</h2>
              <span
                className="text-2xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: `${accentHex}25`,
                  color: accentHex,
                }}
              >
                AI Companion
              </span>
            </div>
            <p className="text-xs opacity-70 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {isLiveConnected
                ? 'In Live Voice Call · Listening'
                : isRecording
                ? 'Recording voice note...'
                : 'Online · WhatsApp-Style Chat'}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Search messages"
            aria-label="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Quick Voice Call Launcher */}
          {onStartLiveCall && (
            <button
              onClick={onStartLiveCall}
              className="p-2 rounded-xl hover:bg-white/10 text-emerald-400 transition-colors cursor-pointer"
              title="Start Live Voice Conversation"
              aria-label="Start Live Voice Conversation"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
          )}

          {/* Export Chat */}
          <button
            onClick={handleExportChat}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Export chat transcript"
            aria-label="Export chat transcript"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Chat */}
          {onClearMessages && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
              title="Clear chat messages"
              aria-label="Clear chat messages"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Maximize / Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:inline-flex p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand full width'}
            aria-label={isExpanded ? 'Collapse' : 'Expand full width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Drawer */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer ml-1"
            aria-label="Close conversation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Optional Search Bar */}
      {isSearchOpen && (
        <div className="px-4 py-2 border-b bg-black/10 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation..."
            className="flex-1 bg-transparent text-xs focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Clear Confirmation Modal Bar */}
      {showClearConfirm && (
        <div className="px-4 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>Are you sure you want to clear this conversation?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClearMessages?.();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-1 text-slate-400 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages List Area (WhatsApp Doodle Aesthetic) */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 relative"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 80%)',
        }}
      >
        {/* Date Stamp Pill */}
        <div className="flex justify-center my-2">
          <span
            className={`text-2xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold opacity-70 ${
              isNight ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Today · End-to-End Multilingual Dialogue
          </span>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md"
              style={{
                backgroundColor: `${accentHex}20`,
                color: accentHex,
              }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold mb-1">Welcome to Lyra</p>
            <p className="text-xs opacity-70 mb-5 max-w-xs">
              Chat naturally with voice notes, Roman Urdu, Pakistani Urdu, or English.
            </p>

            {/* Quick Starter Suggestions */}
            <div className="flex flex-col gap-2 w-full max-w-xs text-left">
              {quickPrompts.slice(0, 3).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(p.text)}
                  className={`p-2.5 text-xs rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between ${
                    isNight
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:border-pink-500/40'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  <span className="text-2xs opacity-60">Send →</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isUser = m.sender === 'user';
            const isUrdu = isUrduText(m.text);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
              >
                {/* Bubble Container */}
                <div
                  className={`relative max-w-[85%] md:max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs transition-all ${
                    isUser
                      ? isNight
                        ? 'bg-[#182a1d] text-emerald-100 rounded-tr-xs border border-emerald-500/30'
                        : 'bg-[#d9fdd3] text-emerald-950 rounded-tr-xs border border-emerald-200'
                      : isPinkNight
                      ? 'bg-[#120f18] text-slate-100 rounded-tl-xs border border-pink-500/20'
                      : isMidnight
                      ? 'bg-[#0f1938] text-slate-100 rounded-tl-xs border border-[#22335c]'
                      : isSoftPink
                      ? 'bg-white text-slate-900 rounded-tl-xs border border-pink-200'
                      : isDay
                      ? 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200'
                      : 'bg-[#141b2d] text-slate-100 rounded-tl-xs border border-slate-700'
                  }`}
                  dir={isUrdu ? 'rtl' : 'ltr'}
                >
                  {/* Sender indicator for Lyra */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-2xs font-bold"
                        style={{ color: accentHex }}
                      >
                        Lyra
                      </span>
                    </div>
                  )}

                  {/* Audio Voice Note Player if audio is attached */}
                  {m.audioBase64 ? (
                    <div className="my-1">
                      <VoiceNotePlayer
                        audioBase64={m.audioBase64}
                        mimeType={m.audioMimeType || 'audio/webm'}
                        duration={m.audioDuration}
                        isUser={isUser}
                        accentColor={accentHex}
                        isNight={isNight}
                      />
                      {m.text && m.text !== '🎤 Voice message' && (
                        <p className="mt-1 text-xs opacity-90 italic border-t border-white/10 pt-1">
                          "{m.text}"
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Plain text message */
                    <p className={`${isUrdu ? 'font-serif text-base' : ''} whitespace-pre-wrap break-words`}>
                      {m.text}
                    </p>
                  )}

                  {/* Message Bottom Metadata (Time + WhatsApp Read Status) */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-2xs opacity-70 font-mono ${
                      isUser ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* WhatsApp Read Status Tick icon */}
                    {isUser && (
                      <span title="Read by Lyra" className="inline-flex items-center">
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      </span>
                    )}
                  </div>

                  {/* Quick Copy Action on Hover */}
                  <button
                    onClick={() => handleCopy(m.id, m.text)}
                    aria-label="Copy message text"
                    className={`absolute ${
                      isUser ? '-left-7' : '-right-7'
                    } top-2 opacity-0 group-hover:opacity-100 p-1 transition-opacity ${
                      isNight ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                    }`}
                    title="Copy message"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Prompts Drawer Menu */}
      {showQuickPrompts && (
        <div className="p-3 border-t bg-black/20 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold uppercase tracking-wider opacity-60">
              Quick Companion Prompts
            </span>
            <button
              onClick={() => setShowQuickPrompts(false)}
              className="text-2xs opacity-60 hover:opacity-100"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSendMessage(p.text);
                  setShowQuickPrompts(false);
                }}
                className="px-2.5 py-1.5 text-2xs rounded-lg border border-white/10 hover:bg-white/10 text-left transition-colors cursor-pointer truncate"
              >
                <strong>{p.label}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. WhatsApp-Style Input Dock */}
      <div
        className={`p-3 border-t shrink-0 transition-colors ${
          isPinkNight
            ? 'bg-[#0d0a13] border-pink-500/20'
            : isMidnight
            ? 'bg-[#080d1c] border-[#1e2a4a]'
            : isSoftPink
            ? 'bg-pink-50 border-pink-200'
            : isDay
            ? 'bg-slate-50 border-slate-200'
            : 'bg-[#0e1424] border-slate-800'
        }`}
      >
        {isRecording ? (
          /* Voice Note Active Recording Deck */
          <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono font-bold text-sm">
                0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
              <span className="text-xs opacity-80">Recording audio note...</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
              >
                Discard
              </button>

              {/* Send Voice Note Button */}
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                Send Note
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar with Attachment, Text Input, Mic & Send */
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Quick Prompts Attachment (+) Button */}
            <button
              type="button"
              onClick={() => setShowQuickPrompts(!showQuickPrompts)}
              className={`p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                showQuickPrompts
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
              }`}
              title="Quick study prompts & shortcuts"
              aria-label="Quick prompts"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input Box */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isLiveConnected
                  ? 'Type to Lyra (or speak into your mic)...'
                  : 'Type a message in Urdu or English...'
              }
              className={`flex-1 px-4 py-2.5 text-sm rounded-full transition-all focus:outline-none ${
                isPinkNight
                  ? 'bg-[#15121e] border border-pink-500/30 text-slate-100 placeholder:text-slate-500 focus:border-pink-400'
                  : isMidnight
                  ? 'bg-[#0f1730] border border-[#22335c] text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                  : isSoftPink
                  ? 'bg-white border border-pink-200 text-slate-900 placeholder:text-slate-400 focus:border-pink-500'
                  : isDay
                  ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600'
                  : 'bg-[#141b2d] border border-slate-700 text-slate-100 placeholder:text-slate-500'
              }`}
            />

            {/* If text is entered, show Send button. Otherwise show Mic for Voice Note */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md"
                style={{
                  backgroundColor: accentHex,
                  color: isDay ? '#ffffff' : '#08080c',
                }}
                aria-label="Send message"
              >
                <Send className="w-4 h-4 ml-0.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                  isPinkNight
                    ? 'bg-pink-500 hover:bg-pink-400 text-slate-950'
                    : isMidnight
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : isSoftPink
                    ? 'bg-pink-500 hover:bg-pink-600 text-white'
                    : isDay
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                }`}
                title="Tap to record voice note"
                aria-label="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
