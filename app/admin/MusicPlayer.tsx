'use client';

import { useState, useRef, useEffect } from 'react';

const TRACKS = [
  {
    id: '1',
    title: 'Chill Lofi',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'Focus Beat',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '3',
    title: 'Night Drive',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
];

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(TRACKS[trackIdx].url);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener('timeupdate', onTime);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audioRef.current = null;
    };
  }, [trackIdx]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, trackIdx]);

  function togglePlay() {
    setPlaying((p) => !p);
  }

  function nextTrack() {
    setPlaying(false);
    setTrackIdx((i) => (i + 1) % TRACKS.length);
    setTimeout(() => setPlaying(true), 100);
  }

  function prevTrack() {
    setPlaying(false);
    setTrackIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);
    setTimeout(() => setPlaying(true), 100);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {open && (
        <div className="glass-card rounded-2xl p-4 w-64 shadow-glow animate-in border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-fuchsia flex items-center justify-center ${
                playing ? 'animate-pulse' : ''
              }`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{TRACKS[trackIdx].title}</p>
              <p className="text-[10px] text-gray-500">Admin vibes</p>
            </div>
          </div>

          <div className="h-1 rounded-full bg-white/10 mb-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-discord-blurple to-discord-fuchsia transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevTrack}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              title="Previous"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full btn-premium flex items-center justify-center text-white"
            >
              {playing ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={nextTrack}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              title="Next"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-14 h-14 rounded-full shadow-glow flex items-center justify-center transition-all duration-300 ${
          playing
            ? 'bg-gradient-to-br from-discord-blurple to-discord-fuchsia scale-105'
            : 'bg-discord-card border border-white/10 hover:border-discord-blurple/50'
        }`}
        title="Music"
      >
        {playing ? (
          <span className="flex gap-0.5 items-end h-4">
            <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
            <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
            <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
          </span>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        )}
      </button>
    </div>
  );
}
