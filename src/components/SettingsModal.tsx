import React, { useState, useRef } from 'react';
import {
  UserSettings,
  AVAILABLE_VOICES,
  AVAILABLE_LANGUAGES,
  THEME_CONFIGS,
  VoicePersona,
  AppTheme,
  RobotLayoutMode,
  WallpaperConfig,
  CustomThemeConfig,
} from '../types/companion';
import {
  X,
  Check,
  Settings2,
  Volume2,
  Loader2,
  Sun,
  Moon,
  Laptop,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Palette,
  Heart,
  Layout,
  Brain,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onOpenInstallDesktop: () => void;
  onOpenMemory?: () => void;
  memoryCount?: number;
  isNight: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenInstallDesktop,
  onOpenMemory,
  memoryCount,
  isNight,
}) => {
  const [userName, setUserName] = useState(settings.userName || '');
  const [voice, setVoice] = useState<VoicePersona>(settings.voice || 'Kore');
  const [theme, setTheme] = useState<AppTheme>(settings.theme || 'pink-night');
  const [preferredLanguage, setPreferredLanguage] = useState(
    settings.preferredLanguage || 'auto'
  );
  const [robotLayout, setRobotLayout] = useState<RobotLayoutMode>(
    settings.robotLayout || 'center'
  );
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(
    settings.wallpaper || { url: null, brightness: 30, blur: 0 }
  );
  const [customTheme, setCustomTheme] = useState<CustomThemeConfig>(
    settings.customTheme || { bgMode: 'dark', accentColor: '#f472b6' }
  );

  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Voice Preview Handler
  const handlePreviewVoice = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewError(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (previewingVoice === voiceId) {
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(voiceId);

    try {
      const res = await fetch('/api/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voiceId }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.audioBase64) {
        const audio = new Audio(
          `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
        );
        audioRef.current = audio;
        audio.onended = () => {
          setPreviewingVoice(null);
          audioRef.current = null;
        };
        await audio.play();
      }
    } catch (err: any) {
      console.error('Failed to preview voice:', err);
      setPreviewError(err?.message || 'Could not play voice preview');
      setPreviewingVoice(null);
    }
  };

  // Image Upload and Compression for Wallpaper
  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Image is too large. Please select an image under 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Resize and compress via canvas to fit safely in localStorage
        const canvas = document.createElement('canvas');
        const maxDimension = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setWallpaper((prev) => ({
            ...prev,
            url: compressedDataUrl,
          }));
        }
      };
      img.onerror = () => {
        setUploadError('Failed to read image file. Try another format.');
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.onerror = () => {
      setUploadError('Error reading file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWallpaper = () => {
    setWallpaper((prev) => ({ ...prev, url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onSave({
      ...settings,
      userName: userName.trim(),
      voice,
      theme,
      robotLayout,
      wallpaper,
      customTheme,
      preferredLanguage,
    });
    onClose();
  };

  const femaleVoices = AVAILABLE_VOICES.filter((v) => v.gender === 'Female');
  const otherVoices = AVAILABLE_VOICES.filter((v) => v.gender !== 'Female');

  // Custom accent color preset options
  const accentPresets = [
    { label: 'Pastel Pink', color: '#f472b6' },
    { label: 'Soft Rose', color: '#fb7185' },
    { label: 'Golden Amber', color: '#fbbf24' },
    { label: 'Lavender Purple', color: '#c084fc' },
    { label: 'Sky Cyan', color: '#38bdf8' },
    { label: 'Mint Emerald', color: '#34d399' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isNight
            ? 'bg-[#08080d] border-pink-500/20 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
            isNight ? 'border-pink-500/20 bg-[#0e0c14]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-bold">Personalize Lyra &amp; Digital World</h2>
          </div>
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Error notifications */}
          {previewError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
              <span>{previewError}</span>
              <button
                type="button"
                onClick={() => setPreviewError(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* SECTION 1: THEMES (Day, Midnight, Pink Night, Soft Pink, Custom) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                Select Theme 🌞🌙🎀
              </label>
              <span className="text-2xs text-pink-400 font-semibold">Live visual previews</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Day Theme */}
              <button
                type="button"
                onClick={() => setTheme('day')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  theme === 'day'
                    ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-slate-50 text-slate-900 shadow-md'
                    : 'border-slate-300/40 bg-slate-100/50 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  {theme === 'day' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-xs font-bold">Day</div>
                <div className="text-2xs opacity-70">Clean light aesthetic</div>
                {/* Mini Preview Dot */}
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" />
                  <span className="w-3 h-3 rounded-full bg-indigo-600" />
                </div>
              </button>

              {/* Midnight Theme */}
              <button
                type="button"
                onClick={() => setTheme('midnight')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  theme === 'midnight'
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-[#090f22] text-amber-200 shadow-md'
                    : 'border-slate-800 bg-[#060a17] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Moon className="w-4 h-4 text-amber-400" />
                  {theme === 'midnight' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-xs font-bold">Midnight</div>
                <div className="text-2xs opacity-70">Deep blue &amp; gold</div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-3 h-3 rounded-full bg-[#040711] border border-blue-900" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                </div>
              </button>

              {/* Pink Night Theme */}
              <button
                type="button"
                onClick={() => setTheme('pink-night')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  theme === 'pink-night'
                    ? 'border-pink-500 ring-2 ring-pink-500/30 bg-[#120e18] text-pink-200 shadow-md'
                    : 'border-slate-800 bg-[#09080e] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  {theme === 'pink-night' && <Check className="w-3.5 h-3.5 text-pink-400" />}
                </div>
                <div className="text-xs font-bold">Pink Night 🎀</div>
                <div className="text-2xs opacity-70">Black &amp; pastel pink</div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-3 h-3 rounded-full bg-[#08080c] border border-pink-900" />
                  <span className="w-3 h-3 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]" />
                </div>
              </button>

              {/* Soft Pink Theme */}
              <button
                type="button"
                onClick={() => setTheme('soft-pink')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  theme === 'soft-pink'
                    ? 'border-pink-500 ring-2 ring-pink-500/30 bg-[#fff5f8] text-pink-950 shadow-md'
                    : 'border-pink-200/50 bg-[#fff8fa] text-pink-900 hover:border-pink-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Heart className="w-4 h-4 text-pink-500" />
                  {theme === 'soft-pink' && <Check className="w-3.5 h-3.5 text-pink-600" />}
                </div>
                <div className="text-xs font-bold">Soft Pink</div>
                <div className="text-2xs opacity-70">Blush &amp; warm white</div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-3 h-3 rounded-full bg-[#fdf2f8] border border-pink-200" />
                  <span className="w-3 h-3 rounded-full bg-pink-500" />
                </div>
              </button>

              {/* Custom Theme */}
              <button
                type="button"
                onClick={() => setTheme('custom')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden sm:col-span-2 ${
                  theme === 'custom'
                    ? 'border-sky-400 ring-2 ring-sky-400/30 bg-slate-900 text-sky-200 shadow-md'
                    : 'border-slate-800 bg-[#0e1424] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Palette className="w-4 h-4 text-sky-400" />
                  {theme === 'custom' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-xs font-bold">Custom Palette</div>
                <div className="text-2xs opacity-70">Personalized background &amp; colors</div>
                <div className="flex items-center gap-1 mt-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: customTheme.accentColor }}
                  />
                  <span className="text-2xs opacity-80">{customTheme.accentColor}</span>
                </div>
              </button>
            </div>

            {/* If Custom Theme selected, show palette picker */}
            {theme === 'custom' && (
              <div className="mt-3 p-3.5 rounded-2xl bg-black/20 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Base Mode:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomTheme((c) => ({ ...c, bgMode: 'dark' }))}
                      className={`px-3 py-1 text-xs rounded-lg font-medium cursor-pointer ${
                        customTheme.bgMode === 'dark'
                          ? 'bg-pink-500 text-slate-950 font-bold'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      Dark Base
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomTheme((c) => ({ ...c, bgMode: 'light' }))}
                      className={`px-3 py-1 text-xs rounded-lg font-medium cursor-pointer ${
                        customTheme.bgMode === 'light'
                          ? 'bg-pink-500 text-slate-950 font-bold'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      Light Base
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold block mb-1.5">Accent Color:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {accentPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() =>
                          setCustomTheme((c) => ({ ...c, accentColor: preset.color }))
                        }
                        className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 border transition-all cursor-pointer ${
                          customTheme.accentColor === preset.color
                            ? 'border-white ring-1 ring-white/50 text-white font-bold'
                            : 'border-transparent text-slate-300 bg-white/5'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                    <input
                      type="color"
                      value={customTheme.accentColor}
                      onChange={(e) =>
                        setCustomTheme((c) => ({ ...c, accentColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      title="Custom color picker"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: DIGITAL WORLD & WALLPAPER CUSTOMIZATION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                Custom Digital World &amp; Wallpaper 🏡
              </label>
              {wallpaper.url && (
                <button
                  type="button"
                  onClick={handleRemoveWallpaper}
                  className="text-2xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Restore Original Background
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-black/20 border border-white/10 space-y-3">
              {/* Wallpaper Preview & Uploader */}
              <div className="flex items-center gap-4">
                <div
                  className="w-24 h-16 rounded-xl border border-white/20 overflow-hidden relative shrink-0 flex items-center justify-center bg-slate-900"
                  style={
                    wallpaper.url
                      ? {
                          backgroundImage: `url(${wallpaper.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  {!wallpaper.url ? (
                    <span className="text-2xs opacity-40 text-center px-1">
                      No custom wallpaper
                    </span>
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `rgba(0,0,0,${wallpaper.brightness / 100})`,
                        backdropFilter: `blur(${wallpaper.blur}px)`,
                      }}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperFileChange}
                    className="hidden"
                    id="wallpaper-upload-input"
                  />
                  <label
                    htmlFor="wallpaper-upload-input"
                    className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {wallpaper.url ? 'Change Wallpaper' : 'Upload Wallpaper Image'}
                  </label>
                  <p className="text-2xs opacity-60 mt-1">
                    Upload any photo from your PC or phone (JPEG, PNG, WebP).
                  </p>
                </div>
              </div>

              {/* Overlay Brightness / Darkness Slider */}
              {wallpaper.url && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-pink-400" />
                      Darkness Overlay (Text readability):
                    </span>
                    <span className="font-mono text-2xs font-bold">
                      {wallpaper.brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={wallpaper.brightness}
                    onChange={(e) =>
                      setWallpaper((w) => ({
                        ...w,
                        brightness: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-pink-500 cursor-pointer"
                  />

                  {/* Blur Slider */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span>Background Soft Blur:</span>
                    <span className="font-mono text-2xs font-bold">{wallpaper.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    value={wallpaper.blur}
                    onChange={(e) =>
                      setWallpaper((w) => ({
                        ...w,
                        blur: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: ROBOT DISPLAY LAYOUT (Center Hero vs Compact Companion) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-2 flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-pink-400" />
              Robot Layout Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRobotLayout('center')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  robotLayout === 'center'
                    ? 'border-pink-500 bg-pink-500/15 font-bold shadow-xs'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-bold">Center Stage (Default)</div>
                <div className="text-2xs opacity-70">
                  Large cute glowing robot in the center of the screen
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRobotLayout('compact')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  robotLayout === 'compact'
                    ? 'border-pink-500 bg-pink-500/15 font-bold shadow-xs'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-bold">Compact Companion Dock</div>
                <div className="text-2xs opacity-70">
                  Compact robot avatar, maximizing space for chat &amp; study
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 4: FEMALE AI VOICES (Lyra Personas) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                Female AI Voices (Lyra Personas) 🎙️
              </label>
              <span className="text-2xs text-pink-400 font-medium">Click ▶ to preview</span>
            </div>

            <div className="space-y-2">
              {femaleVoices.map((v) => {
                const isSelected = voice === v.id;
                const isPlaying = previewingVoice === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? isNight
                          ? 'bg-[#140e1b] border-pink-500 text-slate-100 shadow-[0_0_12px_rgba(244,114,182,0.2)]'
                          : 'bg-pink-50/80 border-pink-600 text-slate-900 shadow-xs'
                        : isNight
                        ? 'bg-[#0b0a12] border-white/10 text-slate-300 hover:border-white/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm">{v.name}</span>
                        <span
                          className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${
                            isSelected
                              ? 'bg-pink-500/20 text-pink-300'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {v.personality}
                        </span>
                        {v.id === 'Kore' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-2xs opacity-80 leading-relaxed">{v.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(v.id, e)}
                        className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-2xs font-semibold ${
                          isPlaying
                            ? 'bg-pink-500 text-slate-950 animate-pulse'
                            : isNight
                            ? 'bg-white/10 text-pink-300 hover:bg-white/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={`Preview ${v.name}'s voice`}
                        aria-label={`Preview ${v.name}'s voice`}
                      >
                        {isPlaying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>

                      {isSelected && <Check className="w-4 h-4 text-pink-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: OTHER VOICE PERSONAS */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-2">
              Other Voice Personas
            </label>
            <div className="grid grid-cols-2 gap-2">
              {otherVoices.map((v) => {
                const isSelected = voice === v.id;
                const isPlaying = previewingVoice === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-pink-500 bg-pink-500/10 font-bold'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{v.name}</div>
                      <div className="text-2xs opacity-70">{v.tone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handlePreviewVoice(v.id, e)}
                      className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                      title="Preview"
                    >
                      {isPlaying ? (
                        <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                      ) : (
                        <Volume2 className="w-3 h-3 opacity-70" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 6: USER NAME & LANGUAGE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1.5">
                Your Preferred Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="What should Lyra call you?"
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none ${
                  isNight
                    ? 'bg-black/30 border-white/15 text-white focus:border-pink-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1.5">
                Preferred Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none ${
                  isNight
                    ? 'bg-[#0f0e16] border-white/15 text-white focus:border-pink-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              >
                {AVAILABLE_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between shrink-0 ${
            isNight ? 'border-pink-500/20 bg-[#0e0c14]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onOpenInstallDesktop}
            className="flex items-center gap-1.5 text-xs text-pink-400 hover:underline cursor-pointer"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Install Windows Desktop App</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
