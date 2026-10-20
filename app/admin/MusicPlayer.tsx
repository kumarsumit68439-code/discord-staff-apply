'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PRESETS = [
  { id: 'jfKfPfyJRdk', title: 'Lofi Girl — beats' },
  { id: '5qap5aO4i9A', title: 'Lofi Hip Hop Radio' },
  { id: 'DWcJFNfaw9c', title: 'Chill Vibes' },
  { id: '7NOSDKb0HlU', title: 'Coding Music' },
];

function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('YouTube Music');
  const [videoId, setVideoId] = useState(PRESETS[0].id);
  const [urlInput, setUrlInput] = useState('');
  const playerRef = useRef<any>(null);
  const containerId = 'yt-admin-player';

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initPlayer = (id: string) => {
      if (!window.YT?.Player) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        videoId: id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) setPlaying(true);
            if (e.data === 2) setPlaying(false);
            if (e.data === 0) {
              // loop current video
              try {
                playerRef.current?.seekTo(0);
                playerRef.current?.playVideo();
              } catch {}
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer(videoId);
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      initPlayer(videoId);
    };

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    return () => {
      // keep player alive while component mounted — only destroy on unmount
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVideo = useCallback((id: string, name?: string) => {
    setVideoId(id);
    if (name) setTitle(name);
    else setTitle('YouTube track');
    setReady(false);
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(id);
      setReady(true);
      setPlaying(true);
    }
  }, []);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    try {
      const state = p.getPlayerState?.();
      if (state === 1) {
        p.pauseVideo();
        setPlaying(false);
      } else {
        p.playVideo();
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
    }
  }

  function playUrl() {
    const id = extractVideoId(urlInput);
    if (!id) {
      alert('Valid YouTube link ya 11-char video ID daalo');
      return;
    }
    loadVideo(id, 'Custom YouTube');
    setUrlInput('');
  }

  function playPreset(p: (typeof PRESETS)[0]) {
    loadVideo(p.id, p.title);
  }

  return (
    <>
      {/* Hidden YouTube player — stays in DOM so music keeps playing when panel closed */}
      <div
        className="fixed opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, bottom: 0, right: 0, overflow: 'hidden' }}
        aria-hidden
      >
        <div id={containerId} />
      </div>

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        {open && (
          <div className="glass-card rounded-2xl p-4 w-72 shadow-glow animate-in border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-discord-blurple flex items-center justify-center flex-shrink-0 ${
                  playing ? 'animate-pulse' : ''
                }`}
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{title}</p>
                <p className="text-[10px] text-gray-500">
                  {playing ? '▶ Playing (panel band bhi chalegi)' : ready ? 'Ready' : 'Loading YouTube...'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && playUrl()}
                placeholder="YouTube link / video ID"
                className="flex-1 input-premium rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                onClick={playUrl}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium"
              >
                Play
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => playPreset(p)}
                  className={`text-[10px] px-2 py-1 rounded-lg border transition ${
                    videoId === p.id
                      ? 'border-discord-blurple bg-discord-blurple/20 text-white'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {p.title.split('—')[0].trim()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!ready}
                className="w-12 h-12 rounded-full btn-premium flex items-center justify-center text-white disabled:opacity-40"
              >
                {playing ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-[9px] text-gray-600 text-center mt-2">
              Panel ✕ karne pe bhi song chalta rahega. Tab band = stop.
            </p>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-14 h-14 rounded-full shadow-glow flex items-center justify-center transition-all duration-300 ${
            playing
              ? 'bg-gradient-to-br from-red-500 to-discord-blurple scale-105'
              : 'bg-discord-card border border-white/10 hover:border-red-500/50'
          }`}
          title="YouTube Music"
        >
          {playing ? (
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
              <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
            </span>
          ) : (
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
