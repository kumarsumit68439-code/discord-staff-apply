'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type SessionUser = {
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
};

type Application = {
  id: string;
  position: string;
  status: string;
  created_at: string;
  admin_note: string | null;
};

const POSITIONS = [
  'Moderator',
  'Admin',
  'Support Staff',
  'Event Manager',
  'Content Creator',
  'Developer',
  'Other',
];

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  if (!error) return null;

  const messages: Record<string, string> = {
    token_exchange: 'Discord token exchange failed. Check Client Secret + Redirect URL.',
    user_fetch: 'Could not fetch Discord profile.',
    config: 'Server missing DISCORD_CLIENT_ID or SECRET.',
    missing_code: 'Discord did not return a code. Try again.',
    callback_failed: 'Login callback failed. Try again.',
    banned: 'You are banned from this website. Contact the server owner.',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 animate-in">
      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        {messages[error] || `Login error: ${error}`}
      </div>
    </div>
  );
}

function HomeContent() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [siteLocked, setSiteLocked] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [form, setForm] = useState({
    position: 'Moderator',
    experience: '',
    why_join: '',
    age: '',
    timezone: '',
    extra: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/site-lock').then((r) => r.json()),
    ])
      .then(([session, lock]) => {
        setUser(session.user || null);
        setSiteLocked(!!lock.locked);
        setNeedsUnlock(!!lock.needsUnlock);
        setStatus('ready');
      })
      .catch(() => setStatus('ready'));
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setLockError(null);
    try {
      const res = await fetch('/api/site-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', password: lockPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLockError(data.error || 'Wrong password');
      } else {
        setNeedsUnlock(false);
        setLockPassword('');
      }
    } catch {
      setLockError('Network error');
    } finally {
      setUnlocking(false);
    }
  }

  useEffect(() => {
    if (user && !needsUnlock) fetchApplications();
  }, [user, needsUnlock]);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.applications) setApplications(data.applications);
      if (data.isAdmin) setIsAdmin(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to submit' });
      } else {
        setMessage({ type: 'success', text: 'Application submitted! We will review it soon.' });
        setForm({
          position: 'Moderator',
          experience: '',
          why_join: '',
          age: '',
          timezone: '',
          extra: '',
        });
        fetchApplications();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogin() {
    window.location.href = '/api/auth/discord';
  }

  function handleLogout() {
    window.location.href = '/api/auth/logout';
  }

  return (
    <div className="premium-bg min-h-screen">
      <header className="header-glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-fuchsia flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Staff Applications</h1>
              <p className="text-[11px] text-gray-500">
                {siteLocked ? '🔒 Locked' : 'Premium staff portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="px-4 py-2 rounded-xl btn-premium text-white text-sm font-medium">
                Admin Panel
              </Link>
            )}
            {user && !needsUnlock ? (
              <div className="flex items-center gap-3 pl-2">
                <div className="avatar-ring w-10 h-10">
                  <div className="avatar-ring-inner w-full h-full relative">
                    {user.discordAvatar ? (
                      <img src={user.discordAvatar} alt="" className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white bg-discord-dark text-sm">
                        {user.discordUsername?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="status-dot" />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white leading-tight">{user.discordUsername}</p>
                  <p className="text-[10px] text-discord-online">Online</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition"
                >
                  Logout
                </button>
              </div>
            ) : !needsUnlock ? (
              <button onClick={handleLogin} className="px-5 py-2.5 rounded-xl btn-premium text-white font-medium text-sm">
                Login with Discord
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {status === 'loading' ? (
          <div className="text-center py-24 text-gray-500 animate-pulse">Loading session...</div>
        ) : needsUnlock ? (
          <div className="max-w-md mx-auto py-16 animate-in">
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-discord-blurple/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-discord-blurple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Website Locked</h2>
              <p className="text-sm text-gray-400 mb-6">
                Admin ne website lock ki hai. Entry ke liye password daalo.
              </p>
              {lockError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{lockError}</div>
              )}
              <form onSubmit={handleUnlock} className="space-y-4">
                <input
                  type="password"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  placeholder="Entry password"
                  className="w-full input-premium rounded-xl px-4 py-3 text-white text-center tracking-widest"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={unlocking}
                  className="w-full py-3 rounded-xl btn-premium text-white font-semibold disabled:opacity-50"
                >
                  {unlocking ? 'Checking...' : 'Enter Website'}
                </button>
              </form>
              <p className="mt-6 text-xs text-gray-500">
                Admin ho?{' '}
                <button type="button" onClick={handleLogin} className="text-discord-blurple hover:underline">
                  Discord se login
                </button>{' '}
                karke bypass.
              </p>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center py-20 animate-in">
            <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Become a{' '}
              <span className="bg-gradient-to-r from-discord-blurple via-discord-fuchsia to-discord-green bg-clip-text text-transparent">
                Staff Member
              </span>
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-10">Login with Discord to apply.</p>
            <button onClick={handleLogin} className="px-10 py-4 rounded-2xl btn-premium text-white font-semibold text-lg">
              Login with Discord
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2 animate-in">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="profile-banner" />
                <div className="px-5 pb-5 -mt-10 relative">
                  <div className="avatar-ring w-20 h-20 mb-3 shadow-glow">
                    <div className="avatar-ring-inner w-full h-full relative">
                      {user.discordAvatar ? (
                        <img src={user.discordAvatar} alt="" className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl bg-discord-dark">
                          {user.discordUsername?.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="status-dot" style={{ width: 18, height: 18, bottom: 0, right: 0 }} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">{user.discordUsername}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1 mb-4">{user.discordId}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30">
                      Applicant
                    </span>
                    {isAdmin && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-discord-yellow/20 text-discord-yellow border border-discord-yellow/30">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 mt-5">
                <h3 className="text-sm font-semibold text-white mb-4">My Applications</h3>
                {loading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : applications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No applications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app.id} className="p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-white text-sm">{app.position}</span>
                          <span className="text-xs capitalize text-discord-yellow">{app.status}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {new Date(app.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-3 animate-in">
              <div className="glass-card rounded-2xl p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-white mb-1">Apply for Staff</h2>
                <p className="text-sm text-gray-400 mb-6">Fill carefully — Discord profile linked.</p>
                {message && (
                  <div
                    className={`mb-5 p-3 rounded-xl text-sm ${
                      message.type === 'success'
                        ? 'bg-discord-green/10 text-discord-green'
                        : 'bg-discord-red/10 text-discord-red'
                    }`}
                  >
                    {message.text}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Discord Username</label>
                      <input type="text" value={user.discordUsername} readOnly className="w-full input-premium rounded-xl px-3 py-2.5 text-gray-300 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Discord User ID</label>
                      <input type="text" value={user.discordId} readOnly className="w-full input-premium rounded-xl px-3 py-2.5 text-gray-300 font-mono text-sm cursor-not-allowed" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Position *</label>
                    <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full input-premium rounded-xl px-3 py-2.5 text-white" required>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Age</label>
                      <input type="number" min={13} max={99} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full input-premium rounded-xl px-3 py-2.5 text-white" placeholder="18" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Timezone</label>
                      <input type="text" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full input-premium rounded-xl px-3 py-2.5 text-white" placeholder="IST" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Experience *</label>
                    <textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={3} required className="w-full input-premium rounded-xl px-3 py-2.5 text-white resize-none" placeholder="Your experience..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Why join? *</label>
                    <textarea value={form.why_join} onChange={(e) => setForm({ ...form, why_join: e.target.value })} rows={4} required className="w-full input-premium rounded-xl px-3 py-2.5 text-white resize-none" placeholder="Why this server?" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase">Anything else?</label>
                    <textarea value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} rows={2} className="w-full input-premium rounded-xl px-3 py-2.5 text-white resize-none" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl btn-premium text-white font-semibold disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="premium-bg min-h-screen text-gray-500 flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
