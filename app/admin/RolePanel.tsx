'use client';

type GuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
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

function roleColor(color: number) {
  if (!color) return '#99aab5';
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function RolePanel({
  member,
  roles,
  rolesError,
  actionLoading,
  onToggle,
  manualRoleId,
  setManualRoleId,
}: {
  member: GuildMember;
  roles: GuildRole[];
  rolesError: string | null;
  actionLoading: string | null;
  onToggle: (userId: string, roleId: string, hasRole: boolean) => void;
  manualRoleId: string;
  setManualRoleId: (v: string) => void;
}) {
  // Show all roles except pure managed bot roles still listable but disabled
  const list = roles.filter((r) => r.name !== '@everyone');

  return (
    <div className="bg-discord-card rounded-2xl p-5 border border-white/5 sticky top-24">
      <div className="flex items-center gap-4 mb-5">
        {member.avatar ? (
          <img src={member.avatar} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-discord-dark flex items-center justify-center text-2xl text-gray-400">
            {member.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xl font-bold text-white">{member.displayName}</p>
          <p className="text-sm text-gray-400">@{member.username}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">{member.id}</p>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-2">Current roles</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {member.roles.length === 0 ? (
          <span className="text-xs text-gray-500">No roles (only @everyone)</span>
        ) : (
          member.roles.map((rid) => {
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

      {list.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Server me custom roles list empty hai. Pehle Discord me roles banao:
            <br />
            <span className="text-white">Server Settings → Roles → Create Role</span> (Admin, Staff, Helper)
          </p>
          <p className="text-xs text-gray-500">
            Ya neeche Role ID paste karke directly assign karo (role pe right click → Copy Role ID)
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {list.map((role) => {
            const has = member.roles.includes(role.id);
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
                    <span className="ml-2 text-[10px] text-gray-500">(bot/managed)</span>
                  )}
                  <p className="text-[10px] text-gray-600 font-mono">{role.id}</p>
                </div>
                <button
                  onClick={() => onToggle(member.id, role.id, has)}
                  disabled={role.managed || actionLoading === member.id + role.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 ${
                    has ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-discord-green'
                  }`}
                >
                  {actionLoading === member.id + role.id ? '...' : has ? 'Remove' : 'Give Role'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-3 border-t border-white/5 space-y-2">
        <p className="text-xs text-gray-500">Manual Role ID (Developer Mode → role right click → Copy ID)</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Role ID"
            value={manualRoleId}
            onChange={(e) => setManualRoleId(e.target.value.trim())}
            className="flex-1 bg-discord-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
          />
          <button
            onClick={() => {
              if (manualRoleId) onToggle(member.id, manualRoleId, false);
            }}
            disabled={!manualRoleId || !!actionLoading}
            className="px-3 py-2 rounded-lg bg-green-500/20 text-discord-green text-xs font-medium disabled:opacity-50"
          >
            Give
          </button>
          <button
            onClick={() => {
              if (manualRoleId) onToggle(member.id, manualRoleId, true);
            }}
            disabled={!manualRoleId || !!actionLoading}
            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
