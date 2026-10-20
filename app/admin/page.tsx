'use client';

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

type SiteAdmin = {
  discord_id: string;
  discord_username: string | null;
  added_by: string | null;
  created_at: string;
};

type SiteBan = {
  discord_id: string;
  discord_username: string | null;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
};

type Tab = 'applications' | 'admins' | 'bans';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [admins, setAdmins] = useState<SiteAdmin[]>([]);
  const [bans, setBans] = useState<SiteBan[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('applications');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [banId, setBanId] = useState('');
  const [banName, setBanName] = useState('');
  const [banReason, setBanReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setLoggedIn(true);
          loadAll();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [appsRes, usersRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/admin/users'),
      ]);
      const appsData = await appsRes.json();
      if (appsData.isAdmin) {
        setIsAdmin(true);
        setApplications(appsData.applications || []);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAdmins(usersData.admins || []);
        setBans(usersData.bans || []);
        setIsOwner(!!usersData.isOwner);
        setOwnerId(usersData.ownerId || '');
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
      if (res.ok) loadAll();
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

  async function manageUser(
    action: 'add_admin' | 'remove_admin' | 'ban' | 'unban',
    discord_id: string,
    discord_username?: string,
    reason?: string
  ) {
    setActionLoading(discord_id + action);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, discord_id, discord_username, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || 'Failed');
      } else {
        setMsg(data.message || 'Done');
        setNewAdminId('');
        setNewAdminName('');
        setBanId('');
        setBanName('');
        setBanReason('');
        loadAll();
      }
    } catch {
      setMsg('Network error');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = applications.filter((a) => filter === 'all' || a.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-discord-darker flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Please login first</p>
        <a href="/api/auth/discord" className="px-6 py-2 rounded-lg bg-discord-blurple text-white">
          Login with Discord
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-discord-darker flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-white font-bold">Access Denied</p>
        <p className="text-gray-400">Admin panel sirf authorized admins ke liye hai.</p>
        <Link href="/" className="text-discord-blurple hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker">
      <header className="border-b border-discord-card bg-discord-dark/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            {isOwner && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Owner</span>
            )}
          </div>
          <button
            onClick={loadAll}
            className="px-3 py-2 rounded-lg bg-discord-card text-sm text-gray-300"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {(
            [
              { id: 'applications' as Tab, label: 'Applications' },
              { id: 'admins' as Tab, label: 'Admins' },
              { id: 'bans' as Tab, label: 'Bans' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === t.id ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-lg bg-discord-blurple/20 text-discord-blurple text-sm">
            {msg}
          </div>
        )}

        {tab === 'applications' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total', value: applications.length, color: 'text-white' },
                {
                  label: 'Pending',
                  value: applications.filter((a) => a.status === 'pending').length,
                  color: 'text-discord-yellow',
                },
                {
                  label: 'Approved',
                  value: applications.filter((a) => a.status === 'approved').length,
                  color: 'text-discord-green',
                },
                {
                  label: 'Rejected',
                  value: applications.filter((a) => a.status === 'rejected').length,
                  color: 'text-discord-red',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-discord-card rounded-xl p-4 border border-white/5 text-center"
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${
                    filter === f
                      ? 'bg-discord-blurple text-white'
                      : 'bg-discord-card text-gray-400'
                  }`}
                >
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-discord-blurple/20 text-discord-blurple">
                          {app.position}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs capitalize ${
                            app.status === 'approved'
                              ? 'text-discord-green'
                              : app.status === 'rejected'
                                ? 'text-discord-red'
                                : 'text-discord-yellow'
                          }`}
                        >
                          {app.status}
                        </span>
                        {app.discord_id !== ownerId && (
                          <button
                            onClick={() =>
                              manageUser('ban', app.discord_id, app.discord_username, 'Banned from app')
                            }
                            className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400"
                          >
                            Ban
                          </button>
                        )}
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
                    <p className="text-xs text-gray-600 mb-3">
                      Applied: {new Date(app.created_at).toLocaleString('en-IN')}
                    </p>
                    {app.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/5">
                        <input
                          type="text"
                          placeholder="Admin note (optional)"
                          value={note[app.id] || ''}
                          onChange={(e) => setNote({ ...note, [app.id]: e.target.value })}
                          className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(app.id, 'approved')}
                            disabled={actionLoading === app.id}
                            className="px-4 py-2 rounded-lg bg-green-500/20 text-discord-green text-sm font-medium disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, 'rejected')}
                            disabled={actionLoading === app.id}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-discord-red text-sm font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
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
          </>
        )}

        {tab === 'admins' && (
          <div className="space-y-6">
            {isOwner ? (
              <div className="bg-discord-card rounded-2xl p-5 border border-white/5">
                <h3 className="text-white font-semibold mb-3">Add Admin (Owner only)</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Discord User ID paste karo (Developer Mode → right click user → Copy User ID)
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Discord User ID"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value.trim())}
                    className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="sm:w-40 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => manageUser('add_admin', newAdminId, newAdminName)}
                    disabled={!newAdminId || !!actionLoading}
                    className="px-4 py-2 rounded-lg bg-discord-blurple text-white text-sm font-medium disabled:opacity-50"
                  >
                    Add Admin
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Only Owner can add/remove admins.</p>
            )}

            <div className="space-y-3">
              {admins.map((a) => (
                <div
                  key={a.discord_id}
                  className="bg-discord-card rounded-xl p-4 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-white font-medium">
                      {a.discord_username || 'Unknown'}
                      {a.discord_id === ownerId && (
                        <span className="ml-2 text-xs text-yellow-400">Owner</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{a.discord_id}</p>
                  </div>
                  {isOwner && a.discord_id !== ownerId && (
                    <button
                      onClick={() => manageUser('remove_admin', a.discord_id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'bans' && (
          <div className="space-y-6">
            <div className="bg-discord-card rounded-2xl p-5 border border-white/5">
              <h3 className="text-white font-semibold mb-3">Ban User from Website</h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Discord User ID"
                    value={banId}
                    onChange={(e) => setBanId(e.target.value.trim())}
                    className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={banName}
                    onChange={(e) => setBanName(e.target.value)}
                    className="sm:w-40 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => manageUser('ban', banId, banName, banReason)}
                  disabled={!banId || !!actionLoading}
                  className="self-start px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium disabled:opacity-50"
                >
                  Ban User
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {bans.length === 0 ? (
                <p className="text-gray-500 text-sm">No banned users.</p>
              ) : (
                bans.map((b) => (
                  <div
                    key={b.discord_id}
                    className="bg-discord-card rounded-xl p-4 border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-white font-medium">{b.discord_username || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 font-mono">{b.discord_id}</p>
                      {b.reason && <p className="text-xs text-gray-400 mt-1">Reason: {b.reason}</p>}
                    </div>
                    <button
                      onClick={() => manageUser('unban', b.discord_id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 text-discord-green text-sm"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
