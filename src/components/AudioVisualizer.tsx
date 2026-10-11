import React, { useEffect, useRef } from 'react';
import { CompanionState, AppTheme, CustomThemeConfig } from '../types/companion';

interface AudioVisualizerProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  state: CompanionState;
  theme?: AppTheme;
  customTheme?: CustomThemeConfig;
  isNight?: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  inputAnalyser,
  outputAnalyser,
  state,
  theme = 'pink-night',
  customTheme,
  isNight = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const activeAnalyser =
        state === 'speaking' ? outputAnalyser : state === 'listening' ? inputAnalyser : null;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barCount = 36;
      const barWidth = 3;
      const gap = (width - barCount * barWidth) / (barCount - 1);

      let buffer: Uint8Array | null = null;
      if (activeAnalyser) {
        buffer = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(buffer as any);
      }

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (buffer && buffer.length > 0) {
          const binIndex = Math.floor((i / barCount) * Math.min(64, buffer.length));
          value = buffer[binIndex] / 255;
        } else if (state === 'thinking') {
          const t = Date.now() / 250;
          value = 0.2 + 0.25 * Math.sin(t + i * 0.3);
        } else if (state === 'idle') {
          const t = Date.now() / 800;
          value = 0.08 + 0.05 * Math.sin(t + i * 0.2);
        }

        const barHeight = Math.max(3, value * height * 0.85);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        if (theme === 'pink-night') {
          if (state === 'speaking') {
            ctx.fillStyle = `rgba(244, 114, 182, ${0.45 + value * 0.55})`;
          } else if (state === 'listening') {
            ctx.fillStyle = `rgba(52, 211, 153, ${0.45 + value * 0.55})`;
          } else if (state === 'thinking') {
            ctx.fillStyle = `rgba(251, 191, 36, ${0.45 + value * 0.55})`;
          } else {
            ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
          }
        } else if (theme === 'midnight') {
          if (state === 'speaking') {
            ctx.fillStyle = `rgba(251, 191, 36, ${0.45 + value * 0.55})`;
          } else if (state === 'listening') {
            ctx.fillStyle = `rgba(52, 211, 153, ${0.45 + value * 0.55})`;
          } else if (state === 'thinking') {
            ctx.fillStyle = `rgba(245, 158, 11, ${0.45 + value * 0.55})`;
          } else {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
          }
        } else if (theme === 'soft-pink') {
          if (state === 'speaking') {
            ctx.fillStyle = `rgba(236, 72, 153, ${0.45 + value * 0.55})`;
          } else if (state === 'listening') {
            ctx.fillStyle = `rgba(16, 185, 129, ${0.45 + value * 0.55})`;
          } else if (state === 'thinking') {
            ctx.fillStyle = `rgba(245, 158, 11, ${0.45 + value * 0.55})`;
          } else {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
          }
        } else if (theme === 'custom' && customTheme?.accentColor) {
          ctx.fillStyle =
            state === 'speaking'
              ? customTheme.accentColor
              : state === 'listening'
              ? 'rgba(52, 211, 153, 0.8)'
              : `${customTheme.accentColor}55`;
        } else {
          // Day theme
          if (state === 'speaking') {
            ctx.fillStyle = `rgba(99, 102, 241, ${0.4 + value * 0.6})`;
          } else if (state === 'listening') {
            ctx.fillStyle = `rgba(16, 185, 129, ${0.4 + value * 0.6})`;
          } else if (state === 'thinking') {
            ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + value * 0.5})`;
          } else {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
          }
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [inputAnalyser, outputAnalyser, state, theme, customTheme, isNight]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={240}
        height={36}
        className="w-60 h-9 opacity-90 transition-opacity duration-300"
      />
    </div>
  );
};
