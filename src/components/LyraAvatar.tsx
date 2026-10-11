import React, { useEffect, useState } from 'react';
import { CompanionState, AppTheme, CustomThemeConfig } from '../types/companion';

interface LyraAvatarProps {
  state: CompanionState;
  inputVolume: number;
  outputVolume: number;
  theme?: AppTheme;
  customTheme?: CustomThemeConfig;
  isNight?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const LyraAvatar: React.FC<LyraAvatarProps> = ({
  state,
  inputVolume,
  outputVolume,
  theme = 'pink-night',
  customTheme,
  isNight = true,
  compact = false,
  onClick,
}) => {
  const [blink, setBlink] = useState(false);
  const [gazeX, setGazeX] = useState(0);
  const [gazeY, setGazeY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Natural blinking cycle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3600 + Math.random() * 2400);

    return () => clearInterval(blinkInterval);
  }, []);

  // Subtle natural gaze wandering when idle or thinking
  useEffect(() => {
    if (state === 'idle') {
      const gazeInterval = setInterval(() => {
        setGazeX((Math.random() - 0.5) * 5);
        setGazeY((Math.random() - 0.5) * 3);
      }, 3200);
      return () => clearInterval(gazeInterval);
    } else if (state === 'thinking') {
      setGazeX(4);
      setGazeY(-3.5);
    } else if (state === 'listening') {
      setGazeX(0);
      setGazeY(1);
    } else if (state === 'happy') {
      setGazeX(0);
      setGazeY(-1);
    } else {
      setGazeX(0);
      setGazeY(0);
    }
  }, [state]);

  // Audio responsiveness
  const activeVolume =
    state === 'speaking' ? outputVolume : state === 'listening' ? inputVolume : 0;
  const pulseScale = 1 + activeVolume * 0.14;
  const ringScale = 1 + activeVolume * 0.42;

  // Visual Palette per theme
  const isPinkNight = theme === 'pink-night';
  const isSoftPink = theme === 'soft-pink';
  const isMidnight = theme === 'midnight';
  const isDay = theme === 'day';
  const isCustom = theme === 'custom';

  // Accent & Glow colors
  let accentHex = '#f472b6'; // Default soft pastel pink
  let glowRgba = 'rgba(244, 114, 182, 0.35)';
  let earTipBg = 'bg-pink-400/80';
  let blushColor = 'rgba(244, 114, 182, 0.65)';
  let eyeColor = 'bg-white';
  let eyeSparkleColor = '#fbcfe8';

  if (isPinkNight) {
    accentHex = '#f472b6';
    glowRgba = 'rgba(244, 114, 182, 0.38)';
    earTipBg = 'bg-pink-400';
    blushColor = 'rgba(244, 114, 182, 0.7)';
    eyeColor = 'bg-white';
    eyeSparkleColor = '#f472b6';
  } else if (isMidnight) {
    accentHex = '#fbbf24';
    glowRgba = 'rgba(251, 191, 36, 0.32)';
    earTipBg = 'bg-amber-400';
    blushColor = 'rgba(251, 191, 36, 0.45)';
    eyeColor = 'bg-amber-100';
    eyeSparkleColor = '#fbbf24';
  } else if (isSoftPink) {
    accentHex = '#ec4899';
    glowRgba = 'rgba(236, 72, 153, 0.25)';
    earTipBg = 'bg-pink-400';
    blushColor = 'rgba(244, 114, 182, 0.6)';
    eyeColor = 'bg-slate-900';
    eyeSparkleColor = '#ec4899';
  } else if (isDay) {
    accentHex = '#6366f1';
    glowRgba = 'rgba(99, 102, 241, 0.25)';
    earTipBg = 'bg-indigo-400/70';
    blushColor = 'rgba(244, 114, 182, 0.5)';
    eyeColor = 'bg-slate-900';
    eyeSparkleColor = '#6366f1';
  } else if (isCustom && customTheme?.accentColor) {
    accentHex = customTheme.accentColor;
    glowRgba = `${customTheme.accentColor}44`;
    earTipBg = 'bg-current';
    blushColor = `${customTheme.accentColor}66`;
    eyeColor = customTheme.bgMode === 'light' ? 'bg-slate-900' : 'bg-white';
    eyeSparkleColor = customTheme.accentColor;
  }

  // Shell gradient
  const shellBackground = isPinkNight
    ? 'radial-gradient(circle at 35% 25%, #18141e 0%, #0c0a12 55%, #050407 100%)'
    : isMidnight
    ? 'radial-gradient(circle at 35% 25%, #1e293b 0%, #0f172a 50%, #050814 100%)'
    : isSoftPink
    ? 'radial-gradient(circle at 35% 25%, #ffffff 0%, #fdf2f8 35%, #fce7f3 75%, #fbcfe8 100%)'
    : isDay
    ? 'radial-gradient(circle at 35% 25%, #ffffff 0%, #f8fafc 30%, #e2e8f0 70%, #cbd5e1 100%)'
    : isCustom && customTheme?.bgMode === 'light'
    ? 'radial-gradient(circle at 35% 25%, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)'
    : 'radial-gradient(circle at 35% 25%, #1e2230 0%, #111420 60%, #080a10 100%)';

  // Compact Mode Render (for compact companion dock or header)
  if (compact) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick?.();
        }}
        aria-label={`Lyra Avatar (Compact) — Status: ${state}`}
        className="relative flex items-center justify-center cursor-pointer select-none group focus:outline-none"
      >
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${1 + activeVolume * 0.1})`,
            background: shellBackground,
            boxShadow: `0 0 14px ${glowRgba}, inset 0 2px 4px rgba(255,255,255,0.3)`,
            border: `1.5px solid ${accentHex}`,
          }}
        >
          {/* Mini ears */}
          <div
            className={`absolute -top-1 left-2.5 w-1.5 h-2.5 rounded-full -rotate-15 ${earTipBg}`}
          />
          <div
            className={`absolute -top-1 right-2.5 w-1.5 h-2.5 rounded-full rotate-15 ${earTipBg}`}
          />

          {/* Mini face */}
          <div className="flex flex-col items-center">
            {/* Eyes */}
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className={`w-2 rounded-full transition-all ${eyeColor}`}
                style={{
                  height: blink ? '2px' : state === 'happy' ? '3px' : '4px',
                }}
              />
              <div
                className={`w-2 rounded-full transition-all ${eyeColor}`}
                style={{
                  height: blink ? '2px' : state === 'happy' ? '3px' : '4px',
                }}
              />
            </div>
            {/* Mouth */}
            <div
              className="w-2 h-1 border-b rounded-b-full"
              style={{ borderColor: accentHex }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full Hero Avatar Render
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      aria-label={`Lyra Avatar — Status: ${state}`}
      className="relative flex items-center justify-center cursor-pointer select-none group focus:outline-none"
    >
      {/* Outer Ambient Glow & Sonic Aura */}
      <div
        className="absolute rounded-full transition-all duration-300 pointer-events-none"
        style={{
          width: '340px',
          height: '340px',
          transform: `scale(${ringScale})`,
          background:
            state === 'speaking'
              ? `radial-gradient(circle, ${glowRgba} 0%, ${accentHex}22 45%, transparent 75%)`
              : state === 'listening'
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(244, 114, 182, 0.15) 50%, transparent 75%)'
              : state === 'thinking'
              ? 'radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(244, 114, 182, 0.18) 50%, transparent 75%)'
              : state === 'happy'
              ? `radial-gradient(circle, ${glowRgba} 0%, rgba(251, 191, 36, 0.2) 45%, transparent 75%)`
              : `radial-gradient(circle, ${glowRgba} 0%, transparent 70%)`,
        }}
      />

      {/* Orbiting Frequency Ring 1 */}
      <div
        className="absolute rounded-full pointer-events-none transition-transform duration-200"
        style={{
          width: '280px',
          height: '280px',
          transform: `scale(${pulseScale}) rotate(${
            state === 'thinking' ? '180deg' : isHovered ? '25deg' : '0deg'
          })`,
          transition: 'transform 0.25s ease-out, border-color 0.3s ease',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          borderColor:
            state === 'speaking'
              ? accentHex
              : state === 'listening'
              ? 'rgba(52, 211, 153, 0.65)'
              : state === 'thinking'
              ? 'rgba(251, 191, 36, 0.65)'
              : state === 'happy'
              ? accentHex
              : `${accentHex}33`,
        }}
      />

      {/* Orbiting Frequency Ring 2 with cute satellite sparkles */}
      <div
        className={`absolute rounded-full border border-dashed pointer-events-none transition-all duration-500 ${
          state === 'thinking' ? 'animate-spin' : ''
        }`}
        style={{
          width: '246px',
          height: '246px',
          borderColor:
            state === 'speaking'
              ? `${accentHex}66`
              : state === 'listening'
              ? 'rgba(16, 185, 129, 0.45)'
              : `${accentHex}33`,
          animationDuration: '14s',
        }}
      >
        {/* Cute orbital spark dot */}
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full flex items-center justify-center"
          style={{
            background: accentHex,
            boxShadow: `0 0 10px ${accentHex}`,
          }}
        >
          <span className="text-2xs text-white">✦</span>
        </div>
      </div>

      {/* Main Character Body Sphere */}
      <div
        className="relative w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          transform: `scale(${pulseScale})`,
          background: shellBackground,
          boxShadow: isNight
            ? state === 'speaking'
              ? `0 14px 44px -8px ${glowRgba}, 0 0 32px ${accentHex}44, inset 0 -8px 24px ${accentHex}22, inset 0 8px 18px rgba(255, 255, 255, 0.25)`
              : state === 'listening'
              ? '0 14px 44px -8px rgba(16, 185, 129, 0.35), inset 0 -8px 24px rgba(16, 185, 129, 0.2), inset 0 8px 18px rgba(255, 255, 255, 0.25)'
              : state === 'thinking'
              ? '0 14px 44px -8px rgba(245, 158, 11, 0.35), inset 0 -8px 24px rgba(245, 158, 11, 0.2), inset 0 8px 18px rgba(255, 255, 255, 0.25)'
              : state === 'happy'
              ? `0 14px 44px -8px ${glowRgba}, 0 0 28px ${accentHex}66, inset 0 -8px 24px ${accentHex}33, inset 0 8px 18px rgba(255, 255, 255, 0.3)`
              : `0 12px 36px -8px rgba(0, 0, 0, 0.6), 0 0 24px ${accentHex}1a, inset 0 -8px 20px rgba(0, 0, 0, 0.5), inset 0 8px 16px rgba(255, 255, 255, 0.2)`
            : state === 'speaking'
            ? `0 14px 40px -8px ${glowRgba}, inset 0 -8px 24px ${accentHex}22, inset 0 8px 16px rgba(255, 255, 255, 0.95)`
            : state === 'listening'
            ? '0 14px 40px -8px rgba(16, 185, 129, 0.35), inset 0 -8px 24px rgba(16, 185, 129, 0.2), inset 0 8px 16px rgba(255, 255, 255, 0.95)'
            : `0 12px 32px -8px rgba(15, 23, 42, 0.12), inset 0 -8px 20px rgba(15, 23, 42, 0.08), inset 0 8px 16px rgba(255, 255, 255, 0.95)`,
          border: isNight
            ? `1.5px solid ${accentHex}44`
            : `1.5px solid ${isSoftPink ? '#f472b644' : 'rgba(255,255,255,0.8)'}`,
        }}
      >
        {/* Soft Glass Shine Arc on the forehead */}
        <div
          className="absolute top-2.5 left-10 right-10 h-10 rounded-full pointer-events-none opacity-40"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%)',
          }}
        />

        {/* Adorable Cat-like / Ribbon Antennae with Soft Glowing Tips */}
        <div
          className={`absolute -top-3.5 left-10 w-4 h-7 rounded-full -rotate-15 transition-transform duration-300 group-hover:-translate-y-1 ${
            isNight ? 'border border-white/20' : 'border border-slate-200/50'
          }`}
          style={{
            background: isPinkNight
              ? 'linear-gradient(to bottom, #f472b6, #09090e)'
              : isMidnight
              ? 'linear-gradient(to bottom, #fbbf24, #0f172a)'
              : isSoftPink
              ? 'linear-gradient(to bottom, #ec4899, #fce7f3)'
              : 'linear-gradient(to bottom, #6366f1, #e2e8f0)',
            boxShadow: `0 0 10px ${accentHex}88`,
          }}
        >
          {/* Ear tip jewel */}
          <div
            className="w-2 h-2 rounded-full mx-auto mt-1"
            style={{
              background: '#ffffff',
              boxShadow: `0 0 6px ${accentHex}`,
            }}
          />
        </div>

        <div
          className={`absolute -top-3.5 right-10 w-4 h-7 rounded-full rotate-15 transition-transform duration-300 group-hover:-translate-y-1 ${
            isNight ? 'border border-white/20' : 'border border-slate-200/50'
          }`}
          style={{
            background: isPinkNight
              ? 'linear-gradient(to bottom, #f472b6, #09090e)'
              : isMidnight
              ? 'linear-gradient(to bottom, #fbbf24, #0f172a)'
              : isSoftPink
              ? 'linear-gradient(to bottom, #ec4899, #fce7f3)'
              : 'linear-gradient(to bottom, #6366f1, #e2e8f0)',
            boxShadow: `0 0 10px ${accentHex}88`,
          }}
        >
          {/* Ear tip jewel */}
          <div
            className="w-2 h-2 rounded-full mx-auto mt-1"
            style={{
              background: '#ffffff',
              boxShadow: `0 0 6px ${accentHex}`,
            }}
          />
        </div>

        {/* Soft Rosy Glowing Cheeks */}
        <div
          className="absolute left-7 md:left-9 top-27 md:top-31 w-6 h-3 rounded-full transition-all duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${blushColor} 0%, transparent 80%)`,
            opacity:
              state === 'speaking' || state === 'happy' ? 0.95 : state === 'listening' ? 0.75 : 0.5,
            transform: state === 'happy' ? 'scale(1.2)' : 'scale(1)',
          }}
        />
        <div
          className="absolute right-7 md:right-9 top-27 md:top-31 w-6 h-3 rounded-full transition-all duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${blushColor} 0%, transparent 80%)`,
            opacity:
              state === 'speaking' || state === 'happy' ? 0.95 : state === 'listening' ? 0.75 : 0.5,
            transform: state === 'happy' ? 'scale(1.2)' : 'scale(1)',
          }}
        />

        {/* Character Face Container */}
        <div
          className="flex flex-col items-center justify-center transition-transform duration-200 z-10"
          style={{
            transform: `translate(${gazeX}px, ${gazeY}px)`,
          }}
        >
          {/* Beautiful Expressive Animated Eyes */}
          <div className="flex items-center gap-7 md:gap-9 mb-2.5">
            {/* Left Eye */}
            <div
              className={`relative rounded-full flex items-center justify-center transition-all duration-150 overflow-hidden ${eyeColor}`}
              style={{
                width: state === 'listening' ? '22px' : '20px',
                height: blink
                  ? '3px'
                  : state === 'muted'
                  ? '3.5px'
                  : state === 'happy'
                  ? '6px'
                  : state === 'listening'
                  ? '26px'
                  : '22px',
                boxShadow: isNight
                  ? `0 0 10px ${accentHex}99, inset 0 0 4px ${accentHex}66`
                  : '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {!blink && state !== 'muted' && (
                <>
                  {state === 'happy' ? (
                    // Happy eye crescent curve
                    <div
                      className="w-full h-full border-b-2 rounded-b-full"
                      style={{ borderColor: accentHex }}
                    />
                  ) : (
                    <>
                      {/* Upper sparkle catchlight */}
                      <div
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: isNight ? '#ffffff' : '#ffffff',
                          boxShadow: `0 0 3px ${eyeSparkleColor}`,
                        }}
                      />
                      {/* Lower sparkle twinkle */}
                      <div
                        className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full opacity-90"
                        style={{
                          background: isNight ? eyeSparkleColor : '#ffffff',
                        }}
                      />
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right Eye */}
            <div
              className={`relative rounded-full flex items-center justify-center transition-all duration-150 overflow-hidden ${eyeColor}`}
              style={{
                width: state === 'listening' ? '22px' : '20px',
                height: blink
                  ? '3px'
                  : state === 'muted'
                  ? '3.5px'
                  : state === 'happy'
                  ? '6px'
                  : state === 'listening'
                  ? '26px'
                  : '22px',
                boxShadow: isNight
                  ? `0 0 10px ${accentHex}99, inset 0 0 4px ${accentHex}66`
                  : '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {!blink && state !== 'muted' && (
                <>
                  {state === 'happy' ? (
                    // Happy eye crescent curve
                    <div
                      className="w-full h-full border-b-2 rounded-b-full"
                      style={{ borderColor: accentHex }}
                    />
                  ) : (
                    <>
                      {/* Upper sparkle catchlight */}
                      <div
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: isNight ? '#ffffff' : '#ffffff',
                          boxShadow: `0 0 3px ${eyeSparkleColor}`,
                        }}
                      />
                      {/* Lower sparkle twinkle */}
                      <div
                        className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full opacity-90"
                        style={{
                          background: isNight ? eyeSparkleColor : '#ffffff',
                        }}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Expressive Mouth / Sound Wave / Expressions */}
          <div className="h-6 flex items-center justify-center">
            {state === 'speaking' ? (
              // Dynamic speaking waveform mouth
              <div className="flex items-center gap-1">
                <span
                  className="w-1 rounded-full transition-all duration-75"
                  style={{
                    background: accentHex,
                    height: `${Math.max(4, activeVolume * 18)}px`,
                  }}
                />
                <span
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    background: accentHex,
                    height: `${Math.max(6, activeVolume * 24)}px`,
                  }}
                />
                <span
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    background: '#ffffff',
                    height: `${Math.max(8, activeVolume * 28)}px`,
                  }}
                />
                <span
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    background: accentHex,
                    height: `${Math.max(6, activeVolume * 24)}px`,
                  }}
                />
                <span
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    background: accentHex,
                    height: `${Math.max(4, activeVolume * 18)}px`,
                  }}
                />
              </div>
            ) : state === 'listening' ? (
              // Attentive small sweet smile
              <div
                className="w-5 h-2.5 border-b-2 rounded-b-full"
                style={{
                  borderColor: accentHex,
                  boxShadow: `0 1px 4px ${accentHex}66`,
                }}
              />
            ) : state === 'thinking' ? (
              // Curious tiny glowing circle mouth
              <div
                className="w-3 h-3 rounded-full border-2 animate-pulse"
                style={{
                  borderColor: '#fbbf24',
                  boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)',
                }}
              />
            ) : state === 'happy' ? (
              // Wide happy beaming smile
              <div
                className="w-6 h-3.5 border-b-2 rounded-b-full transition-all"
                style={{
                  borderColor: accentHex,
                  boxShadow: `0 2px 8px ${accentHex}`,
                }}
              />
            ) : state === 'muted' ? (
              // Straight peaceful line
              <div
                className="w-4 h-0.5 rounded-full opacity-60"
                style={{ background: isNight ? '#ffffff' : '#64748b' }}
              />
            ) : (
              // Sweet warm idle smile
              <div
                className="w-5 h-2.5 border-b-2 rounded-b-full transition-colors"
                style={{
                  borderColor: isNight ? `${accentHex}cc` : '#334155',
                }}
              />
            )}
          </div>
        </div>

        {/* Floating celestial star or heart indicator */}
        <div
          className="absolute top-4 right-5 text-xs select-none transition-all duration-300"
          style={{
            transform:
              state === 'speaking' || state === 'happy'
                ? 'scale(1.3) rotate(15deg)'
                : isHovered
                ? 'scale(1.15) rotate(10deg)'
                : 'scale(1)',
            opacity: state === 'idle' ? 0.6 : 1,
            color: accentHex,
            textShadow: `0 0 10px ${accentHex}`,
          }}
        >
          {state === 'happy' ? '💖' : '✦'}
        </div>
      </div>
    </div>
  );
};
