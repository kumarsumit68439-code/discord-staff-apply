'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LockPanel } from './LockPanel';
import { MusicPlayer } from './MusicPlayer';

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

type GuildMember = {
  id: string;
  username: string;
  globalName: string | null;
  displayName: string;
  avatar: string | null;
  roles: string[];
  joinedAt: string | null;
};

type GuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

type Tab = 'applications' | 'members' | 'admins' | 'bans' | 'lock';

function roleColor(color: number) {
  if (!color) return '#99aab5';
  return `#${color.toString(16).padStart(6, '0')}`;
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [admins, setAdmins] = useState<SiteAdmin[]>([]);
  const [bans, setBans] = useState<SiteBan[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
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
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [manualRoleId, setManualRoleId] = useState('');
  const [rolesError, setRolesError] = useState<string | null>(null);

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

  async function loadMembers() {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await fetch('/api/admin/discord/members');
      const data = await res.json();
      if (!res.ok) {
        setMembersError(data.error || 'Failed to load members');
        setMembers([]);
        setRoles([]);
        setRolesError(null);
      } else {
        setMembers(data.members || []);
        setRoles(data.roles || []);
        setRolesError(data.rolesError || null);
        if (data.rolesError && !(data.roles || []).length) {
          setMembersError(data.rolesError);
        }
      }
    } catch {
      setMembersError('Network error loading Discord members');
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'members' && isAdmin) loadMembers();
  }, [tab, isAdmin]);

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
      if (!res.ok) setMsg(data.error || 'Failed');
      else {
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

  async function toggleRole(userId: string, roleId: string, hasRole: boolean) {
    setActionLoading(userId + roleId);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/discord/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: hasRole ? 'remove' : 'add',
          user_id: userId,
          role_id: roleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || 'Role update failed');
      } else {
        setMsg(data.message);
        setMembers((prev) =>
          prev.map((m) => {
            if (m.id !== userId) return m;
            const nextRoles = hasRole
              ? m.roles.filter((r) => r !== roleId)
              : [...m.roles, roleId];
            return { ...m, roles: nextRoles };
          })
        );
        if (selectedMember?.id === userId) {
          setSelectedMember((prev) =>
            prev
              ? {
                  ...prev,
                  roles: hasRole
                    ? prev.roles.filter((r) => r !== roleId)
                    : [...prev.roles, roleId],
                }
              : null
          );
        }
      }
    } catch {
      setMsg('Network error');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = applications.filter((a) => filter === 'all' || a.status === filter);
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    if (!q) return true;
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      m.id.includes(q)
    );
  });

  const assignableRoles = roles.filter((r) => r.name !== '@everyone');

  if (loading) {
    return (
      <div className="premium-bg min-h-screen flex items-center justify-center text-gray-400">
        <div className="animate-pulse text-sm">Loading admin...</div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="premium-bg min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Please login first</p>
        <a href="/api/auth/discord" className="px-6 py-2.5 rounded-xl btn-premium text-white text-sm font-medium">
          Login with Discord
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="premium-bg min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-white font-bold">Access Denied</p>
        <Link href="/" className="text-discord-blurple hover:underline text-sm">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="premium-bg min-h-screen">
      <header className="header-glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition text-sm px-2 py-1 rounded-lg hover:bg-white/5"
            >
              ← Back
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-discord-blurple to-discord-fuchsia flex items-center justify-center shadow-glow-sm">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Admin Panel</h1>
              <p className="text-[10px] text-gray-500">Premium control center</p>
            </div>
            {isOwner && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-discord-yellow/20 text-discord-yellow border border-discord-yellow/30">
                Owner
              </span>
            )}
          </div>
          <button
            onClick={() => {
              loadAll();
              if (tab === 'members') loadMembers();
            }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition border border-white/5"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 animate-in">
        <div className="flex gap-2 mb-6 flex-wrap">
          {(
            [
              { id: 'applications' as Tab, label: 'Applications' },
              { id: 'members' as Tab, label: 'Server Members' },
              { id: 'admins' as Tab, label: 'Site Admins' },
              { id: 'bans' as Tab, label: 'Site Bans' },
              { id: 'lock' as Tab, label: 'Site Lock' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelectedMember(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? 'btn-premium text-white shadow-glow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-discord-blurple/15 border border-discord-blurple/30 text-discord-blurple text-sm animate-in">
            {msg}
          </div>
        )}

        {tab === 'lock' && (
          <div className="animate-in">
            <LockPanel />
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-4 animate-in">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-gray-400 mb-3">
                Discord server members — click → Give Role
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="flex-1 input-premium rounded-xl px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={loadMembers}
                  disabled={membersLoading}
                  className="px-4 py-2 rounded-xl btn-premium text-white text-sm disabled:opacity-50"
                >
                  {membersLoading ? 'Loading...' : 'Reload Members'}
                </button>
              </div>
            </div>
            {membersError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {membersError}
              </div>
            )}
            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">{filteredMembers.length} members</p>
                {filteredMembers.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 animate-in ${
                      selectedMember?.id === m.id
                        ? 'bg-discord-blurple/20 border-discord-blurple shadow-glow-sm'
                        : 'glass-card border-white/5 hover:border-discord-blurple/30'
                    }`}
                  >
                    <div className="avatar-ring w-10 h-10 flex-shrink-0">
                      <div className="avatar-ring-inner w-full h-full">
                        {m.avatar ? (
                          <img src={m.avatar} alt="" className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 bg-discord-dark">
                            {m.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">@{m.username}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-3">
                {selectedMember ? (
                  <div className="glass-card rounded-2xl p-5 animate-in">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="avatar-ring w-16 h-16 shadow-glow">
                        <div className="avatar-ring-inner w-full h-full">
                          {selectedMember.avatar ? (
                            <img src={selectedMember.avatar} alt="" className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400 bg-discord-dark">
                              {selectedMember.displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{selectedMember.displayName}</p>
                        <p className="text-sm text-gray-400">@{selectedMember.username}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{selectedMember.id}</p>
                      </div>
                    </div>
                    <p className="text-sm text-white font-medium mb-3">Assign Role</p>
                    {assignableRoles.length === 0 ? (
                      <p className="text-sm text-gray-400 mb-3">
                        No roles. Discord me roles banao ya Role ID use karo.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                        {assignableRoles.map((role) => {
                          const has = selectedMember.roles.includes(role.id);
                          return (
                            <div
                              key={role.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition"
                            >
                              <span className="text-sm font-medium" style={{ color: roleColor(role.color) }}>
                                {role.name}
                              </span>
                              <button
                                onClick={() => toggleRole(selectedMember.id, role.id, has)}
                                disabled={role.managed || !!actionLoading}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${
                                  has
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-green-500/20 text-discord-green hover:bg-green-500/30'
                                }`}
                              >
                                {has ? 'Remove' : 'Give Role'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="pt-3 border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        placeholder="Manual Role ID"
                        value={manualRoleId}
                        onChange={(e) => setManualRoleId(e.target.value.trim())}
                        className="flex-1 input-premium rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                      <button
                        onClick={() =>
                          manualRoleId && toggleRole(selectedMember.id, manualRoleId, false)
                        }
                        className="px-3 py-2 rounded-xl bg-green-500/20 text-discord-green text-xs font-medium"
                      >
                        Give
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-10 text-center text-gray-500">
                    Select a member
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="space-y-4 animate-in">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-xl text-sm capitalize transition ${
                    filter === f
                      ? 'btn-premium text-white'
                      : 'bg-white/5 text-gray-400 border border-white/5'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {filtered.map((app) => (
              <div key={app.id} className="glass-card rounded-2xl p-5 hover:border-discord-blurple/20 transition">
                <p className="font-semibold text-white">{app.discord_username}</p>
                <p className="text-xs text-gray-500 font-mono mb-2">{app.discord_id}</p>
                <p className="text-sm text-gray-300 mb-2">
                  {app.position} —{' '}
                  <span
                    className={
                      app.status === 'approved'
                        ? 'text-discord-green'
                        : app.status === 'rejected'
                          ? 'text-discord-red'
                          : 'text-discord-yellow'
                    }
                  >
                    {app.status}
                  </span>
                </p>
                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(app.id, 'approved')}
                      className="px-4 py-2 rounded-xl bg-green-500/20 text-discord-green text-sm font-medium hover:bg-green-500/30 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, 'rejected')}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-discord-red text-sm font-medium hover:bg-red-500/30 transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'admins' && (
          <div className="space-y-4 animate-in">
            {isOwner && (
              <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Discord User ID"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value.trim())}
                  className="flex-1 input-premium rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
                <button
                  onClick={() => manageUser('add_admin', newAdminId, newAdminName)}
                  className="px-4 py-2 rounded-xl btn-premium text-white text-sm"
                >
                  Add Admin
                </button>
              </div>
            )}
            {admins.map((a) => (
              <div
                key={a.discord_id}
                className="glass-card rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">{a.discord_username || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 font-mono">{a.discord_id}</p>
                </div>
                {isOwner && a.discord_id !== ownerId && (
                  <button
                    onClick={() => manageUser('remove_admin', a.discord_id)}
                    className="text-red-400 text-sm hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'bans' && (
          <div className="space-y-4 animate-in">
            <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Discord User ID"
                value={banId}
                onChange={(e) => setBanId(e.target.value.trim())}
                className="flex-1 input-premium rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              <button
                onClick={() => manageUser('ban', banId, banName, banReason)}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium"
              >
                Ban
              </button>
            </div>
            {bans.map((b) => (
              <div
                key={b.discord_id}
                className="glass-card rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-white">{b.discord_username || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 font-mono">{b.discord_id}</p>
                </div>
                <button
                  onClick={() => manageUser('unban', b.discord_id)}
                  className="text-discord-green text-sm hover:underline"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <MusicPlayer />
    </div>
  );
}
