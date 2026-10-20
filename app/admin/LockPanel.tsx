'use client';

import { useState, useEffect } from 'react';

export function LockPanel() {
  const [siteLocked, setSiteLocked] = useState(false);
  const [lockPassInput, setLockPassInput] = useState('');
  const [lockSaving, setLockSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/site-lock')
      .then((r) => r.json())
      .then((data) => {
        setSiteLocked(!!data.locked);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveLock(locked: boolean) {
    setLockSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = { action: 'set_lock', locked };
      if (lockPassInput.trim()) body.password = lockPassInput.trim();
      const res = await fetch('/api/site-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || 'Failed');
      else {
        setMsg(data.message);
        setSiteLocked(locked);
        if (lockPassInput.trim()) setLockPassInput('');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setLockSaving(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading lock status...</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      {msg && (
        <div className="p-3 rounded-lg bg-discord-blurple/20 text-discord-blurple text-sm">{msg}</div>
      )}
      <div className="bg-discord-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-white font-semibold text-lg mb-2">Website Lock</h3>
        <p className="text-sm text-gray-400 mb-5">
          Lock ON hone pe normal users ko password chahiye website enter karne ke liye.{' '}
          <strong className="text-white">Admins</strong> ko password nahi lagta — seedha access.
        </p>
        <div
          className={`mb-5 p-4 rounded-xl border ${
            siteLocked
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <p className={`text-sm font-medium ${siteLocked ? 'text-red-400' : 'text-discord-green'}`}>
            Status: {siteLocked ? '🔒 LOCKED' : '🔓 OPEN'}
          </p>
        </div>
        <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
          Entry Password {siteLocked ? '(change optional)' : '(required to lock)'}
        </label>
        <input
          type="text"
          value={lockPassInput}
          onChange={(e) => setLockPassInput(e.target.value)}
          placeholder="Password jo users enter karenge"
          className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white mb-4"
        />
        <div className="flex flex-wrap gap-3">
          {!siteLocked ? (
            <button
              onClick={() => saveLock(true)}
              disabled={lockSaving || !lockPassInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm disabled:opacity-50"
            >
              {lockSaving ? '...' : 'Lock Website'}
            </button>
          ) : (
            <>
              <button
                onClick={() => saveLock(false)}
                disabled={lockSaving}
                className="px-5 py-2.5 rounded-xl bg-green-500/20 text-discord-green font-medium text-sm disabled:opacity-50"
              >
                {lockSaving ? '...' : 'Unlock Website'}
              </button>
              {lockPassInput.trim() && (
                <button
                  onClick={() => saveLock(true)}
                  disabled={lockSaving}
                  className="px-5 py-2.5 rounded-xl bg-discord-blurple text-white font-medium text-sm disabled:opacity-50"
                >
                  Update Password
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
