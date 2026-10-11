export type CompanionState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'connecting'
  | 'happy'
  | 'error';

export type AppTheme = 'day' | 'midnight' | 'pink-night' | 'soft-pink' | 'custom';

export type ResponseMode = 'text-and-voice' | 'text-only' | 'voice-only';

export type RobotLayoutMode = 'center' | 'compact';

export type VoicePersona =
  | 'Kore'
  | 'Aoede'
  | 'Leda'
  | 'Callirrhoe'
  | 'Fenrir'
  | 'Puck'
  | 'Charon'
  | 'Zephyr';

export interface VoiceOption {
  id: VoicePersona;
  name: string;
  tone: string;
  gender: 'Female' | 'Male' | 'Neutral';
  personality: string;
  description: string;
}

export interface LanguageOption {
  id: string;
  label: string;
  nativeLabel: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export interface CustomThemeConfig {
  bgMode: 'dark' | 'light';
  accentColor: string; // hex, e.g. '#f472b6'
  secondaryColor?: string;
}

export interface WallpaperConfig {
  url: string | null; // Base64 data URL or null
  brightness: number; // 0 to 100 (percentage overlay / darkness)
  blur: number; // 0 to 20 px
}

export interface UserSettings {
  userName: string;
  preferredLanguage: string;
  voice: VoicePersona;
  theme: AppTheme;
  customTheme?: CustomThemeConfig;
  responseMode: ResponseMode;
  wallpaper: WallpaperConfig;
  robotLayout: RobotLayoutMode;
  interests: string[];
  onboardingCompleted: boolean;
  speechRate?: number;
  autoStartGreeting?: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'lyra';
  text: string;
  timestamp: number;
  language?: string;
  audioBase64?: string;
  audioMimeType?: string;
  audioDuration?: number;
  isVoiceNote?: boolean;
  status?: 'sending' | 'sent' | 'read';
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'normal';
  createdAt: number;
}

export interface StudyNote {
  id: string;
  topic: string;
  note: string;
  createdAt: number;
}

export interface FocusTimerState {
  isRunning: boolean;
  durationMinutes: number;
  remainingSeconds: number;
  label: string;
}

export type MemoryCategory =
  | 'identity'
  | 'preferences'
  | 'goals'
  | 'life'
  | 'communication';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  source?: 'user_explicit' | 'learned' | 'manual';
  createdAt: number;
  updatedAt?: number;
}

export const MEMORY_CATEGORIES: { id: MemoryCategory; label: string; icon: string; description: string }[] = [
  { id: 'identity', label: 'Identity & Name', icon: '👤', description: 'Name, nickname, background, identity' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️', description: 'Voice, topics, language, likes and dislikes' },
  { id: 'goals', label: 'Goals & Study', icon: '🎯', description: 'Exams, milestones, career, study plans' },
  { id: 'life', label: 'Life & Work', icon: '🌿', description: 'Routine, habits, schedule, context' },
  { id: 'communication', label: 'Communication', icon: '💬', description: 'Tone, humor, conciseness, encouragement' },
];

export const DEFAULT_MEMORIES: MemoryItem[] = [
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

export const THEME_CONFIGS: Record<
  AppTheme,
  {
    id: AppTheme;
    name: string;
    description: string;
    previewBg: string;
    previewAccent: string;
    isDark: boolean;
  }
> = {
  day: {
    id: 'day',
    name: 'Day (Pristine Light)',
    description: 'Clean light aesthetic with crisp slate and white tones',
    previewBg: '#f8fafc',
    previewAccent: '#4f46e5',
    isDark: false,
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep midnight blue and blue-black with soft golden accents',
    previewBg: '#040711',
    previewAccent: '#fbbf24',
    isDark: true,
  },
  'pink-night': {
    id: 'pink-night',
    name: 'Pink Night',
    description: 'Jet black, soft pastel pink, and white with cute glowing highlights',
    previewBg: '#08080c',
    previewAccent: '#f472b6',
    isDark: true,
  },
  'soft-pink': {
    id: 'soft-pink',
    name: 'Soft Pink',
    description: 'Gentle blush pink-and-white aesthetic, soothing and warm',
    previewBg: '#fdf2f8',
    previewAccent: '#ec4899',
    isDark: false,
  },
  custom: {
    id: 'custom',
    name: 'Custom Palette',
    description: 'Personalized background and accent color chosen by you',
    previewBg: '#111827',
    previewAccent: '#38bdf8',
    isDark: true,
  },
};

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    tone: 'Gentle & Warm',
    gender: 'Female',
    personality: 'Warm & Friendly',
    description: 'Natural, gentle, warm conversational companion voice (Recommended for Lyra)',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    tone: 'Cheerful & Expressive',
    gender: 'Female',
    personality: 'Cheerful & Bright',
    description: 'Enthusiastic, radiant, expressive female voice full of positive energy',
  },
  {
    id: 'Leda',
    name: 'Leda',
    tone: 'Soft & Soothing',
    gender: 'Female',
    personality: 'Calm & Tranquil',
    description: 'Peaceful, relaxing, supportive tone great for unwinding and gentle studying',
  },
  {
    id: 'Callirrhoe',
    name: 'Callirrhoe',
    tone: 'Confident & Articulate',
    gender: 'Female',
    personality: 'Confident & Intellectual',
    description: 'Articulate, smart, confident female voice with crisp conversational flow',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    tone: 'Confident & Natural',
    gender: 'Male',
    personality: 'Confident Male',
    description: 'Deep, warm, confident male voice',
  },
  {
    id: 'Puck',
    name: 'Puck',
    tone: 'Lively & Engaging',
    gender: 'Male',
    personality: 'Lively Male',
    description: 'Energetic, humorous, and expressive male voice',
  },
  {
    id: 'Charon',
    name: 'Charon',
    tone: 'Calm & Deep',
    gender: 'Male',
    personality: 'Calm Deep Male',
    description: 'Serene, thoughtful male tone suitable for deep focus sessions',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    tone: 'Smooth & Balanced',
    gender: 'Neutral',
    personality: 'Smooth Modern',
    description: 'Warm, balanced modern voice with fluid pacing',
  },
];

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  {
    id: 'auto',
    label: 'Auto Detect (Natural Switch)',
    nativeLabel: 'خودکار (اردو / English)',
    flag: '🌐',
  },
  {
    id: 'ur-PK',
    label: 'Pakistani Urdu',
    nativeLabel: 'پاکستانی اردو',
    flag: '🇵🇰',
    direction: 'rtl',
  },
  {
    id: 'roman-ur',
    label: 'Roman Urdu',
    nativeLabel: 'Roman Urdu (Aap kaise hain?)',
    flag: '🇵🇰',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English (Conversational)',
    flag: '🇺🇸',
  },
  {
    id: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    flag: '🇮🇳',
  },
];
