import React, { useState } from 'react';
import {
  UserSettings,
  AVAILABLE_VOICES,
  AVAILABLE_LANGUAGES,
  VoicePersona,
  AppTheme,
} from '../types/companion';
import { Sparkles, ArrowRight, Check, Sun, Moon } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (settings: UserSettings) => void;
  onSkip: () => void;
  currentSettings: UserSettings;
  isNight?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
  currentSettings,
  isNight = false,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(currentSettings.userName || '');
  const [voice, setVoice] = useState<VoicePersona>(currentSettings.voice || 'Kore');
  const [theme, setTheme] = useState<AppTheme>(currentSettings.theme || 'pink-night');
  const [language, setLanguage] = useState(currentSettings.preferredLanguage || 'auto');
  const [interests, setInterests] = useState<string[]>(
    currentSettings.interests.length > 0
      ? currentSettings.interests
      : ['Studies & Learning', 'Daily Planning']
  );

  if (!isOpen) return null;

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleFinish = () => {
    onComplete({
      ...currentSettings,
      userName: name.trim(),
      voice,
      theme,
      preferredLanguage: language,
      interests,
      onboardingCompleted: true,
    });
  };

  const interestOptions = [
    'Studies & Learning',
    'Tech & Coding',
    'Daily Planning & Reminders',
    'Creative Writing & Ideas',
    'Casual Conversation',
    'Urdu Literature & Poetry',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isNight
            ? 'bg-[#080d1c] border-[#1e2a4a] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 pb-4 border-b flex items-center justify-between ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isNight
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Meet Lyra</h2>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                Your real-time AI companion
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className={`text-xs font-medium ${
              isNight ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Skip for now
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= i
                  ? isNight
                    ? 'bg-amber-400'
                    : 'bg-indigo-600'
                  : isNight
                  ? 'bg-slate-800'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 flex-1 min-h-[310px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  What would you like Lyra to call you?
                </h3>
                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lyra will address you warmly by your preferred name during voice conversations.
                </p>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name (e.g. Hadi, Raja, Alex)..."
                autoFocus
                className={`w-full px-4 py-3 text-sm rounded-xl border transition-colors focus:outline-none ${
                  isNight
                    ? 'bg-[#0d142b] border-[#22335c] text-slate-100 focus:border-amber-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />

              {/* Theme choice preview */}
              <div className="pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Preferred Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('pink-night')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between text-xs cursor-pointer ${
                      theme === 'pink-night'
                        ? 'bg-[#120e18] border-pink-500 text-pink-300 ring-1 ring-pink-500/40'
                        : isNight
                        ? 'bg-[#0d142b] border-[#1e2a4a] text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      {theme === 'pink-night' && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </div>
                    <div className="font-bold text-2xs">Pink Night 🎀</div>
                    <div className="text-2xs opacity-70">Cute Robot</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('midnight')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between text-xs cursor-pointer ${
                      theme === 'midnight'
                        ? 'bg-[#0e1630] border-amber-400 text-amber-300 ring-1 ring-amber-400/30'
                        : isNight
                        ? 'bg-[#0d142b] border-[#1e2a4a] text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Moon className="w-4 h-4 text-amber-400" />
                      {theme === 'midnight' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="font-bold text-2xs">Midnight</div>
                    <div className="text-2xs opacity-70">Deep Blue</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('day')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between text-xs cursor-pointer ${
                      theme === 'day'
                        ? 'bg-white border-indigo-600 text-slate-900 ring-1 ring-indigo-600/30 shadow-xs'
                        : isNight
                        ? 'bg-[#0d142b] border-[#1e2a4a] text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Sun className="w-4 h-4 text-amber-500" />
                      {theme === 'day' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="font-bold text-2xs">Day</div>
                    <div className="text-2xs opacity-70">Clean Light</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Choose Lyra’s Voice Persona 🎙️
                </h3>
                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Multiple natural female and expressive voices tailored for continuous real-time conversation.
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {AVAILABLE_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoice(v.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-colors cursor-pointer ${
                      voice === v.id
                        ? isNight
                          ? 'bg-[#0f1938] border-amber-400 text-slate-100 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                          : 'bg-indigo-50/70 border-indigo-600 text-slate-900'
                        : isNight
                        ? 'bg-[#0b1022] border-[#1e2a4a] text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{v.name}</span>
                        <span
                          className={`text-2xs px-2 py-0.5 rounded-full ${
                            voice === v.id
                              ? isNight
                                ? 'bg-amber-400/20 text-amber-300'
                                : 'bg-indigo-100 text-indigo-700'
                              : isNight
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.personality}
                        </span>
                        <span className="text-2xs opacity-60">({v.gender})</span>
                      </div>
                      <p className="text-2xs opacity-75 mt-0.5">{v.description}</p>
                    </div>
                    {voice === v.id && (
                      <Check
                        className={`w-4 h-4 shrink-0 mt-1 ${
                          isNight ? 'text-amber-400' : 'text-indigo-600'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Language &amp; Focus Areas
                </h3>
                <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lyra supports Pakistani Urdu, Roman Urdu, English, and bilingual mixing.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5 opacity-80">
                  Language Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                        language === lang.id
                          ? isNight
                            ? 'bg-[#0f1938] border-amber-400 text-amber-300 font-semibold'
                            : 'bg-indigo-50/70 border-indigo-600 text-slate-900 font-semibold'
                          : isNight
                          ? 'bg-[#0b1022] border-[#1e2a4a] text-slate-300 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5 opacity-80">
                  Interests &amp; Goals
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {interestOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        interests.includes(item)
                          ? isNight
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-slate-900 text-white font-medium'
                          : isNight
                          ? 'bg-[#0d142b] text-slate-400 hover:text-slate-200 border border-[#1e2a4a]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`p-6 pt-4 border-t flex items-center justify-between ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className={`px-4 py-2 text-xs font-medium cursor-pointer ${
                isNight ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                isNight
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                isNight
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.25)]'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              Start Talking with Lyra
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
