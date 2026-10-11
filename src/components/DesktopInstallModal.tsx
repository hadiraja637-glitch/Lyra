import React from 'react';
import { X, Laptop, Check, Download, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppTheme } from '../types/companion';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  isNight: boolean;
}

export const DesktopInstallModal: React.FC<DesktopInstallModalProps> = ({
  isOpen,
  onClose,
  isNight,
}) => {
  const { isInstallable, isInstalled, isWindows, install } = usePWAInstall();

  if (!isOpen) return null;

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
          className={`p-5 border-b flex items-center justify-between ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isNight
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Install Lyra on Your Device</h2>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                Install on PC, Android, or iPhone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isNight
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status banner */}
          {isInstalled ? (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                isNight
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">Lyra is already installed as a desktop application!</p>
                <p className="opacity-90">
                  You can launch it anytime from your Windows Start Menu, Taskbar, or Desktop.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                isNight
                  ? 'bg-gradient-to-br from-[#0e1733] to-[#121d40] border-amber-400/30'
                  : 'bg-gradient-to-br from-indigo-50/70 to-slate-50 border-indigo-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">1-Click Windows App Install Ready</h3>
                  <p className={`text-xs mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                    Adds Lyra directly to your Windows Start Menu, Desktop, and Taskbar.
                  </p>
                </div>
                <Sparkles className={`w-5 h-5 ${isNight ? 'text-amber-400' : 'text-indigo-600'}`} />
              </div>

              <button
                onClick={async () => {
                  const res = await install();
                  if (res) onClose();
                }}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  isNight
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Download className="w-4 h-4" />
                Install Lyra on This PC Now
              </button>
            </div>
          ) : null}

          {/* How Desktop App Works on Windows */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Desktop Experience on Windows 10 & 11
            </h3>

            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs leading-relaxed ${
                isNight ? 'bg-[#0b1022] border-[#1e2a4a]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5 ${
                    isNight ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  1
                </span>
                <div>
                  <strong className="block text-slate-200">Standalone Window (No Browser Chrome)</strong>
                  <span className={isNight ? 'text-slate-400' : 'text-slate-600'}>
                    Launches as its own clean, distraction-free desktop window without browser tabs or address bar.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5 ${
                    isNight ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  2
                </span>
                <div>
                  <strong className="block text-slate-200">Integrated Start Menu & Taskbar</strong>
                  <span className={isNight ? 'text-slate-400' : 'text-slate-600'}>
                    Appears in your Windows search, Start Menu app list, and can be pinned to your Taskbar.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5 ${
                    isNight ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  3
                </span>
                <div>
                  <strong className="block text-slate-200">Low-Latency Hardware Mic & Audio</strong>
                  <span className={isNight ? 'text-slate-400' : 'text-slate-600'}>
                    Uses direct hardware audio capture (16kHz) and 24kHz playback with full offline app shell caching.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Install Instructions for Edge/Chrome */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Manual Installation Steps
            </h3>

            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                isNight ? 'bg-[#0b1022] border-[#1e2a4a]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <strong className={isNight ? 'text-amber-300' : 'text-indigo-700'}>
                  Microsoft Edge (Recommended for Windows):
                </strong>
                <p className={`mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                  Click the <strong>App icon (three squares with plus)</strong> in the top-right address bar, or click <strong>Settings (...) &gt; Apps &gt; Install Lyra</strong>.
                </p>
              </div>

              <div className="pt-1.5 border-t border-slate-800/40">
                <strong className={isNight ? 'text-amber-300' : 'text-indigo-700'}>
                  Google Chrome:
                </strong>
                <p className={`mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                  Click the <strong>Install icon (monitor with down arrow)</strong> in the address bar, or click <strong>Menu &gt; Cast, save, and share &gt; Install Lyra</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile installation instructions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Install on Your Phone
            </h3>
            <div
              className={`p-3.5 rounded-2xl border space-y-3 text-xs leading-relaxed ${
                isNight ? 'bg-[#0b1022] border-[#1e2a4a]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <strong className={isNight ? 'text-amber-300' : 'text-indigo-700'}>Android (Chrome):</strong>
                <p className={`mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                  Open Lyra in Chrome, tap the three dots (⋮), then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. Confirm the prompt. The wording can vary by phone/browser.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/40">
                <strong className={isNight ? 'text-amber-300' : 'text-indigo-700'}>iPhone (Safari):</strong>
                <p className={`mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                  Open Lyra in Safari, tap the <strong>Share</strong> icon, scroll down, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>. Use Safari for this option; it may not appear in other iPhone browsers.
                </p>
              </div>
              <p className={isNight ? 'text-slate-400' : 'text-slate-500'}>
                After adding it, launch Lyra from your Home Screen. Allow microphone access when asked so voice chat can work. An internet connection is still needed for the live AI conversation.
              </p>
            </div>
          </div>

          {/* Technical Note on Desktop Architecture */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-2xs ${
              isNight ? 'bg-[#070b16] border-[#18233f] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong>Security & Real-Time Connection:</strong> Lyra connects to Gemini Live’s low-latency streaming audio bridge. Windows PWA provides the native desktop window and offline shell, while your cloud API session remains secure.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-end ${
            isNight ? 'border-[#1e2a4a] bg-[#0c1328]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              isNight ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
