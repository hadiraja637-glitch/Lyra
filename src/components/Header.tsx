import React from 'react';
import { CompanionState, AppTheme, CustomThemeConfig } from '../types/companion';
import {
  PhoneCall,
  PhoneOff,
  Sun,
  Moon,
  Sparkles,
  Heart,
  Palette,
  Laptop,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Settings2,
  Brain,
} from 'lucide-react';

interface HeaderProps {
  state: CompanionState;
  onToggleCall: () => void;
  onOpenTranscript: () => void;
  onOpenTools: () => void;
  onOpenMemory?: () => void;
  onOpenSettings: () => void;
  onOpenInstallDesktop: () => void;
  activeLanguageLabel: string;
  theme: AppTheme;
  customTheme?: CustomThemeConfig;
  isNight: boolean;
  hasCustomWallpaper?: boolean;
  memoryCount?: number;
  onThemeChange: (newTheme: AppTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onToggleCall,
  onOpenTranscript,
  onOpenTools,
  onOpenMemory,
  onOpenSettings,
  onOpenInstallDesktop,
  activeLanguageLabel,
  theme,
  customTheme,
  isNight,
  hasCustomWallpaper = false,
  onThemeChange,
}) => {
  const isCallActive = state !== 'idle' && state !== 'error';

  // Cycle themes easily via top button
  const cycleTheme = () => {
    const themeCycle: AppTheme[] = ['pink-night', 'day', 'midnight', 'soft-pink', 'custom'];
    const nextIdx = (themeCycle.indexOf(theme) + 1) % themeCycle.length;
    onThemeChange(themeCycle[nextIdx]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'pink-night':
        return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
      case 'midnight':
        return <Moon className="w-3.5 h-3.5 text-amber-400" />;
      case 'soft-pink':
        return <Heart className="w-3.5 h-3.5 text-pink-500" />;
      case 'custom':
        return <Palette className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'pink-night':
        return 'Pink Night';
      case 'midnight':
        return 'Midnight';
      case 'soft-pink':
        return 'Soft Pink';
      case 'custom':
        return 'Custom';
      default:
        return 'Day';
    }
  };

  return (
    <header
      className={`flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b sticky top-0 z-30 transition-colors backdrop-blur-md ${
        isNight
          ? 'border-white/10 bg-black/40 text-slate-100'
          : 'border-slate-200/80 bg-white/70 text-slate-900'
      }`}
    >
      {/* Zone 1: Single text element wordmark & active language indicator */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <a
          href="/"
          className={`text-lg font-bold tracking-tight transition-colors flex items-center gap-1.5 ${
            isNight ? 'text-white hover:text-pink-300' : 'text-slate-900 hover:text-indigo-600'
          }`}
        >
          <span>Lyra</span>
          {theme === 'pink-night' && <span className="text-pink-400 text-xs">🎀</span>}
        </a>
        <span className="text-xs opacity-40">·</span>
        <span className="text-xs font-medium opacity-80 hidden sm:inline">
          {activeLanguageLabel}
        </span>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav
        className={`hidden md:flex items-center gap-6 text-xs font-medium ${
          isNight ? 'text-slate-300' : 'text-slate-600'
        }`}
      >
        <button
          onClick={onOpenTranscript}
          className="transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-pink-400 flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp Chat</span>
        </button>

        <button
          onClick={onOpenTools}
          className="transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-pink-400 flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Study &amp; Focus</span>
        </button>

        {onOpenMemory && (
          <button
            onClick={onOpenMemory}
            className="transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-pink-400 flex items-center gap-1.5"
          >
            <Brain className="w-3.5 h-3.5 text-pink-400" />
            <span>Memory</span>
            {typeof memoryCount === 'number' && (
              <span className="text-2xs px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-semibold">
                {memoryCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-pink-400 flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Voice &amp; Themes</span>
        </button>

        <button
          onClick={onOpenInstallDesktop}
          className={`transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer flex items-center gap-1.5 ${
            isNight
              ? 'text-pink-300 hover:text-pink-200 font-semibold'
              : 'text-indigo-600 hover:text-indigo-800 font-semibold'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Windows App</span>
        </button>
      </nav>

      {/* Zone 3: Quick Theme Cycler + Memory + Wallpaper Indicator + Call Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Memory Shortcut */}
        {onOpenMemory && (
          <button
            onClick={onOpenMemory}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer md:hidden flex items-center justify-center ${
              isNight
                ? 'border-white/10 hover:bg-white/10 text-pink-400'
                : 'border-slate-200 hover:bg-slate-100 text-indigo-600'
            }`}
            title="Lyra's Long-Term Memory"
            aria-label="Open Memory Manager"
          >
            <Brain className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Custom Wallpaper Shortcut */}
        {hasCustomWallpaper && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-pink-400 cursor-pointer hidden sm:flex items-center gap-1 text-2xs font-semibold"
            title="Custom Wallpaper Active"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Custom Space</span>
          </button>
        )}

        {/* Quick Theme Switcher Button */}
        <button
          onClick={cycleTheme}
          className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            isNight
              ? 'bg-black/30 border-white/15 text-slate-200 hover:border-pink-500/40 hover:text-white'
              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-xs'
          }`}
          title={`Active Theme: ${getThemeLabel()}. Click to switch theme!`}
          aria-label="Cycle application theme"
        >
          {getThemeIcon()}
          <span className="hidden sm:inline text-2xs">{getThemeLabel()}</span>
        </button>

        {/* Primary Call Action */}
        <button
          onClick={onToggleCall}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 shadow-xs cursor-pointer ${
            isCallActive
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : theme === 'pink-night'
              ? 'bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold shadow-[0_0_16px_rgba(244,114,182,0.3)]'
              : theme === 'midnight'
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-[0_0_16px_rgba(251,191,36,0.3)]'
              : theme === 'soft-pink'
              ? 'bg-pink-500 hover:bg-pink-600 text-white font-bold'
              : isNight
              ? 'bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
          aria-label={isCallActive ? 'End voice call' : 'Start voice call'}
        >
          {isCallActive ? (
            <>
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start Voice</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
