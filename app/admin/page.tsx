'use client';

import { useSession, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type Application = {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  position: string;
  experience: string;
  why_join: string;
  age: number | null;
  timezone: string | null;
  extra: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session) fetchApps();
  }, [session]);

  async function fetchApps() {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.isAdmin) {
        setIsAdmin(true);
        setApplications(data.applications || []);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: 'approved' | 'rejected') {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_note: note[id] || null }),
      });
      if (res.ok) fetchApps();
      else {
        const data = await res.json();
        alert(data.error || 'Failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = applications.filter((a) => filter === 'all' || a.status === filter);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-discord-darker flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-discord-darker flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Please login first</p>
        <button onClick={() => signIn('discord')} className="px-6 py-2 rounded-lg bg-discord-blurple text-white">Login with Discord</button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-discord-darker flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-white font-bold">Access Denied</p>
        <p className="text-gray-400">You are not an admin.</p>
        <Link href="/" className="text-discord-blurple hover:underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker">
      <header className="border-b border-discord-card bg-discord-dark/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">← Back</Link>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <button onClick={fetchApps} className="px-3 py-2 rounded-lg bg-discord-card text-sm text-gray-300">Refresh</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: applications.length, color: 'text-white' },
            { label: 'Pending', value: applications.filter((a) => a.status === 'pending').length, color: 'text-discord-yellow' },
            { label: 'Approved', value: applications.filter((a) => a.status === 'approved').length, color: 'text-discord-green' },
            { label: 'Rejected', value: applications.filter((a) => a.status === 'rejected').length, color: 'text-discord-red' },
          ].map((s) => (
            <div key={s.label} className="bg-discord-card rounded-xl p-4 border border-white/5 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No applications found.</p>
          ) : (
            filtered.map((app) => (
              <div key={app.id} className="bg-discord-card rounded-2xl p-5 border border-white/5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-semibold text-white">{app.discord_username}</p>
                    <p className="text-xs text-gray-500 font-mono">{app.discord_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs bg-discord-blurple/20 text-discord-blurple">{app.position}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs capitalize ${app.status === 'approved' ? 'text-discord-green' : app.status === 'rejected' ? 'text-discord-red' : 'text-discord-yellow'}`}>{app.status}</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Experience</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{app.experience}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Why Join</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{app.why_join}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">Applied: {new Date(app.created_at).toLocaleString('en-IN')}</p>
                {app.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/5">
                    <input type="text" placeholder="Admin note (optional)" value={note[app.id] || ''} onChange={(e) => setNote({ ...note, [app.id]: e.target.value })} className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(app.id, 'approved')} disabled={actionLoading === app.id} className="px-4 py-2 rounded-lg bg-green-500/20 text-discord-green text-sm font-medium disabled:opacity-50">Approve</button>
                      <button onClick={() => updateStatus(app.id, 'rejected')} disabled={actionLoading === app.id} className="px-4 py-2 rounded-lg bg-red-500/20 text-discord-red text-sm font-medium disabled:opacity-50">Reject</button>
                    </div>
                  </div>
                )}
                {app.admin_note && app.status !== 'pending' && (
                  <p className="text-xs text-gray-400 mt-2">Note: {app.admin_note}</p>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
