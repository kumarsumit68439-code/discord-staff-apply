'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type SearchItem = {
  videoId: string;
  title: string;
  channel: string;
  thumb: string | null;
};

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('YouTube Music');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const containerId = 'yt-admin-player';
  const apiLoaded = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const create = () => {
      if (!window.YT?.Player) return;
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        videoId: 'jfKfPfyJRdk',
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
            if (e.data === 1) setPlaying(true);
            if (e.data === 2) setPlaying(false);
            if (e.data === 0) {
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
      create();
      return;
    }

    if (!apiLoaded.current) {
      apiLoaded.current = true;
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, []);

  const playVideo = useCallback((videoId: string, name: string) => {
    setTitle(name);
    setError(null);
    const p = playerRef.current;
    if (p?.loadVideoById) {
      p.loadVideoById(videoId);
      setPlaying(true);
      setReady(true);
    } else {
      setError('Player loading... 2 sec baad phir try karo');
    }
  }, []);

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed');
        setResults([]);
      } else {
        setResults(data.items || []);
        if (!(data.items || []).length) setError('Koi result nahi mila');
      }
    } catch {
      setError('Network error');
    } finally {
      setSearching(false);
    }
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (p.getPlayerState?.() === 1) {
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

  return (
    <>
      <div
        className="fixed opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, bottom: 0, right: 0, overflow: 'hidden' }}
        aria-hidden
      >
        <div id={containerId} />
      </div>

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        {open && (
          <div className="glass-card rounded-2xl p-4 w-80 max-h-[70vh] overflow-y-auto shadow-glow animate-in border border-white/10">
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
                  {playing ? '▶ Playing' : ready ? 'YouTube v3 API' : 'Loading player...'}
                </p>
              </div>
            </div>

            <form onSubmit={doSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search song / artist..."
                className="flex-1 input-premium rounded-lg px-2.5 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="px-3 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50"
              >
                {searching ? '...' : 'Search'}
              </button>
            </form>

            {error && (
              <div className="mb-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-[11px]">{error}</div>
            )}

            {results.length > 0 && (
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.videoId}
                    onClick={() => playVideo(item.videoId, item.title)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-left transition border border-transparent hover:border-white/10"
                  >
                    {item.thumb ? (
                      <img src={item.thumb} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-9 rounded bg-white/10 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] text-white truncate leading-tight">{item.title}</p>
                      <p className="text-[9px] text-gray-500 truncate">{item.channel}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center">
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
              Panel band = song chalta. Tab close = stop.
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
              <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '60%' }} />
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
