import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioBase64: string;
  mimeType?: string;
  duration?: number;
  isUser?: boolean;
  accentColor?: string;
  isNight?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioBase64,
  mimeType = 'audio/webm',
  duration,
  isUser = false,
  accentColor = '#f472b6',
  isNight = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioUrl = `data:${mimeType};base64,${audioBase64}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioBase64, mimeType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error('Audio playback error:', e);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[210px] sm:min-w-[260px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
          isUser
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : isNight
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform Scrubber & Timer */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Fake waveform bars that animate or reflect progress */}
        <div className="flex items-center gap-0.5 h-6 px-1">
          {[40, 70, 45, 90, 60, 30, 80, 100, 65, 40, 85, 50, 75, 95, 45, 60, 35, 80, 55, 70].map((h, i) => {
            const barProgress = (i / 20) * 100;
            const isPassed = progress >= barProgress;
            return (
              <span
                key={i}
                className="w-1 rounded-full transition-all duration-150"
                style={{
                  height: `${(h / 100) * 20}px`,
                  backgroundColor: isUser
                    ? isPassed
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.4)'
                    : isPassed
                    ? accentColor
                    : isNight
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.2)',
                }}
              />
            );
          })}
        </div>

        {/* Range Slider Scrubber */}
        <div className="flex items-center justify-between text-2xs opacity-80 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 opacity-60" />
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
