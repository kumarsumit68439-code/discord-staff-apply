'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type Application = {
  id: string;
  position: string;
  status: string;
  created_at: string;
  admin_note: string | null;
};

const POSITIONS = ['Moderator', 'Admin', 'Support Staff', 'Event Manager', 'Content Creator', 'Developer', 'Other'];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ position: 'Moderator', experience: '', why_join: '', age: '', timezone: '', extra: '' });

  useEffect(() => {
    if (session) fetchApplications();
  }, [session]);

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
        setForm({ position: 'Moderator', experience: '', why_join: '', age: '', timezone: '', extra: '' });
        fetchApplications();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-discord-darker">
      <header className="border-b border-discord-card bg-discord-dark/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Staff Applications</h1>
            <p className="text-xs text-gray-400">Join our team</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurple/80 text-white text-sm font-medium">
                Admin Panel
              </Link>
            )}
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">{(session.user as any)?.discordUsername || session.user?.name}</span>
                <button onClick={() => signOut()} className="px-3 py-2 rounded-lg bg-discord-card text-gray-300 text-sm hover:text-red-400">
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('discord')} className="px-4 py-2 rounded-lg bg-discord-blurple text-white font-medium">
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {status === 'loading' ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : !session ? (
          <div className="text-center py-16">
            <h2 className="text-3xl font-bold text-white mb-3">Become a Staff Member</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">Login with Discord to apply for staff positions.</p>
            <button onClick={() => signIn('discord')} className="px-8 py-3 rounded-xl bg-discord-blurple text-white font-semibold text-lg">
              Login with Discord
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="bg-discord-card rounded-2xl p-6 border border-white/5">
                <h2 className="text-xl font-bold text-white mb-1">Apply for Staff</h2>
                <p className="text-sm text-gray-400 mb-6">Fill the form carefully.</p>
                {message && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {message.text}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Position *</label>
                    <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white" required>
                      {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1.5">Age</label>
                      <input type="number" min={13} max={99} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white" placeholder="18" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1.5">Timezone</label>
                      <input type="text" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white" placeholder="IST" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Experience *</label>
                    <textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={3} required className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white resize-none" placeholder="Your moderation experience..." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Why join our staff? *</label>
                    <textarea value={form.why_join} onChange={(e) => setForm({ ...form, why_join: e.target.value })} rows={4} required className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white resize-none" placeholder="Why this server?" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Anything else?</label>
                    <textarea value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} rows={2} className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2.5 text-white resize-none" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-discord-blurple hover:bg-[#4752c4] disabled:opacity-50 text-white font-semibold">
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-discord-card rounded-2xl p-6 border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">My Applications</h3>
                {loading ? <p className="text-gray-400 text-sm">Loading...</p> : applications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No applications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app.id} className="p-3 rounded-xl bg-discord-dark border border-white/5">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-white text-sm">{app.position}</span>
                          <span className={`text-xs capitalize ${app.status === 'approved' ? 'text-discord-green' : app.status === 'rejected' ? 'text-discord-red' : 'text-discord-yellow'}`}>{app.status}</span>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString('en-IN')}</p>
                        {app.admin_note && <p className="mt-2 text-xs text-gray-400">Note: {app.admin_note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
