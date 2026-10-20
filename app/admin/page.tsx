'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RolePanel } from './RolePanel';

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

type Tab = 'applications' | 'members' | 'admins' | 'bans';

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
            onClick={() => {
              loadAll();
              if (tab === 'members') loadMembers();
            }}
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
              { id: 'members' as Tab, label: 'Server Members' },
              { id: 'admins' as Tab, label: 'Site Admins' },
              { id: 'bans' as Tab, label: 'Site Bans' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelectedMember(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === t.id ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-lg bg-discord-blurple/20 text-discord-blurple text-sm">{msg}</div>
        )}

        {tab === 'members' && (
          <div className="space-y-4">
            <div className="bg-discord-card rounded-2xl p-4 border border-white/5">
              <p className="text-sm text-gray-400 mb-3">
                Discord server members. Click user → Give Role (role Discord server pe lagta hai).
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={loadMembers}
                  disabled={membersLoading}
                  className="px-4 py-2 rounded-lg bg-discord-blurple text-white text-sm disabled:opacity-50"
                >
                  {membersLoading ? 'Loading...' : 'Reload Members'}
                </button>
              </div>
            </div>

            {membersError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {membersError}
              </div>
            )}

            {membersLoading && members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Loading Discord members...</p>
            ) : (
              <div className="grid lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">{filteredMembers.length} members</p>
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition ${
                        selectedMember?.id === m.id
                          ? 'bg-discord-blurple/20 border-discord-blurple'
                          : 'bg-discord-card border-white/5 hover:border-white/20'
                      }`}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-discord-dark flex items-center justify-center text-gray-400 text-sm">
                          {m.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{m.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">@{m.username}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-3">
                  {selectedMember ? (
                    <div className="bg-discord-card rounded-2xl p-5 border border-white/5 sticky top-24">
                      <div className="flex items-center gap-4 mb-5">
                        {selectedMember.avatar ? (
                          <img src={selectedMember.avatar} alt="" className="w-16 h-16 rounded-full" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-discord-dark flex items-center justify-center text-2xl text-gray-400">
                            {selectedMember.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xl font-bold text-white">{selectedMember.displayName}</p>
                          <p className="text-sm text-gray-400">@{selectedMember.username}</p>
                          <p className="text-xs text-gray-500 font-mono mt-1">{selectedMember.id}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mb-2">Current roles</p>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {selectedMember.roles.length === 0 ? (
                          <span className="text-xs text-gray-500">No roles (only @everyone)</span>
                        ) : (
                          selectedMember.roles.map((rid) => {
                            const role = roles.find((r) => r.id === rid);
                            return (
                              <span
                                key={rid}
                                className="px-2.5 py-1 rounded-full text-xs border border-white/10"
                                style={{ color: role ? roleColor(role.color) : '#99aab5' }}
                              >
                                {role?.name || rid}
                              </span>
                            );
                          })
                        )}
                      </div>

                      <p className="text-sm text-white font-medium mb-3">Assign / Remove Discord Role</p>
                      {rolesError && (
                        <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs">{rolesError}</div>
                      )}
                      {assignableRoles.length === 0 ? (
                        <p className="text-sm text-gray-400 mb-3">
                          Server me custom role nahi mili. Discord: <span className="text-white">Server Settings → Roles → Create</span> (Admin, Staff, Helper). Ya Role ID se do.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                          {assignableRoles.map((role) => {
                            const has = selectedMember.roles.includes(role.id);
                            return (
                              <div
                                key={role.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-discord-dark border border-white/5"
                              >
                                <div>
                                  <span className="text-sm font-medium" style={{ color: roleColor(role.color) }}>
                                    {role.name}
                                  </span>
                                  {role.managed && (
                                    <span className="ml-2 text-[10px] text-gray-500">(managed)</span>
                                  )}
                                  <p className="text-[10px] text-gray-600 font-mono">{role.id}</p>
                                </div>
                                <button
                                  onClick={() => toggleRole(selectedMember.id, role.id, has)}
                                  disabled={role.managed || actionLoading === selectedMember.id + role.id}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 ${
                                    has ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-discord-green'
                                  }`}
                                >
                                  {actionLoading === selectedMember.id + role.id
                                    ? '...'
                                    : has
                                      ? 'Remove'
                                      : 'Give Role'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-3 border-t border-white/5 space-y-2">
                        <p className="text-xs text-gray-500">
                          Manual Role ID (Developer Mode ON → Roles list me role pe right-click → Copy Role ID)
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Role ID"
                            value={manualRoleId}
                            onChange={(e) => setManualRoleId(e.target.value.trim())}
                            className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                          />
                          <button
                            onClick={() =>
                              manualRoleId && toggleRole(selectedMember.id, manualRoleId, false)
                            }
                            disabled={!manualRoleId || !!actionLoading}
                            className="px-3 py-2 rounded-lg bg-green-500/20 text-discord-green text-xs font-medium disabled:opacity-50"
                          >
                            Give
                          </button>
                          <button
                            onClick={() =>
                              manualRoleId && toggleRole(selectedMember.id, manualRoleId, true)
                            }
                            disabled={!manualRoleId || !!actionLoading}
                            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-discord-card rounded-2xl p-10 border border-white/5 text-center text-gray-500">
                      Left se member click karo → role assign.
                    </div>
                  )}
                </div>
              </div>
            )}
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
                <div key={s.label} className="bg-discord-card rounded-xl p-4 border border-white/5 text-center">
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
                    filter === f ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'
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
                      <span className="px-2.5 py-1 rounded-full text-xs bg-discord-blurple/20 text-discord-blurple">
                        {app.position}
                      </span>
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(app.id, 'approved')}
                          className="px-4 py-2 rounded-lg bg-green-500/20 text-discord-green text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, 'rejected')}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-discord-red text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'admins' && (
          <div className="space-y-6">
            {isOwner && (
              <div className="bg-discord-card rounded-2xl p-5 border border-white/5">
                <h3 className="text-white font-semibold mb-3">Add Site Admin</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Discord User ID"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value.trim())}
                    className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <button
                    onClick={() => manageUser('add_admin', newAdminId, newAdminName)}
                    disabled={!newAdminId}
                    className="px-4 py-2 rounded-lg bg-discord-blurple text-white text-sm disabled:opacity-50"
                  >
                    Add Admin
                  </button>
                </div>
              </div>
            )}
            {admins.map((a) => (
              <div
                key={a.discord_id}
                className="bg-discord-card rounded-xl p-4 border border-white/5 flex justify-between"
              >
                <div>
                  <p className="text-white">{a.discord_username || 'Unknown'}</p>
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
        )}

        {tab === 'bans' && (
          <div className="space-y-6">
            <div className="bg-discord-card rounded-2xl p-5 border border-white/5">
              <h3 className="text-white font-semibold mb-3">Ban from Website</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Discord User ID"
                  value={banId}
                  onChange={(e) => setBanId(e.target.value.trim())}
                  className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
                <button
                  onClick={() => manageUser('ban', banId, banName, banReason)}
                  disabled={!banId}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm disabled:opacity-50"
                >
                  Ban
                </button>
              </div>
            </div>
            {bans.map((b) => (
              <div
                key={b.discord_id}
                className="bg-discord-card rounded-xl p-4 border border-white/5 flex justify-between"
              >
                <div>
                  <p className="text-white">{b.discord_username || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 font-mono">{b.discord_id}</p>
                </div>
                <button
                  onClick={() => manageUser('unban', b.discord_id)}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 text-discord-green text-sm"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
