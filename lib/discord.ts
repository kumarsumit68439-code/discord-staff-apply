const API = 'https://discord.com/api/v10';

export function getBotConfig() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) {
    return { ok: false as const, error: 'DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set' };
  }
  return { ok: true as const, token, guildId };
}

function botHeaders(token: string) {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  };
}

export type GuildMember = {
  id: string;
  username: string;
  globalName: string | null;
  displayName: string;
  avatar: string | null;
  roles: string[];
  joinedAt: string | null;
};

export type GuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

export async function fetchGuildMembers(): Promise<
  { ok: true; members: GuildMember[] } | { ok: false; error: string }
> {
  const cfg = getBotConfig();
  if (!cfg.ok) return cfg;

  const members: GuildMember[] = [];
  let after = '0';

  // Paginate up to ~5000 members
  for (let i = 0; i < 5; i++) {
    const res = await fetch(
      `${API}/guilds/${cfg.guildId}/members?limit=1000&after=${after}`,
      { headers: botHeaders(cfg.token) }
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 403) {
        return {
          ok: false,
          error:
            'Bot cannot list members. Enable Server Members Intent + invite bot with View Members permission.',
        };
      }
      return { ok: false, error: `Discord API ${res.status}: ${text}` };
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const m of batch) {
      const u = m.user;
      if (!u || u.bot) continue;
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
        : null;
      members.push({
        id: u.id,
        username: u.username,
        globalName: u.global_name || null,
        displayName: m.nick || u.global_name || u.username,
        avatar,
        roles: m.roles || [],
        joinedAt: m.joined_at || null,
      });
    }

    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, members };
}

export async function fetchGuildRoles(): Promise<
  { ok: true; roles: GuildRole[] } | { ok: false; error: string }
> {
  const cfg = getBotConfig();
  if (!cfg.ok) return cfg;

  const res = await fetch(`${API}/guilds/${cfg.guildId}/roles`, {
    headers: botHeaders(cfg.token),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Discord API ${res.status}: ${text}` };
  }

  const data = await res.json();
  const roles: GuildRole[] = (data as any[])
    .filter((r) => r.name !== '@everyone')
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      position: r.position,
      managed: r.managed,
    }))
    .sort((a, b) => b.position - a.position);

  return { ok: true, roles };
}

export async function addRole(
  userId: string,
  roleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getBotConfig();
  if (!cfg.ok) return cfg;

  const res = await fetch(
    `${API}/guilds/${cfg.guildId}/members/${userId}/roles/${roleId}`,
    {
      method: 'PUT',
      headers: botHeaders(cfg.token),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      return {
        ok: false,
        error:
          'Cannot assign role. Bot role must be ABOVE the target role in Server Settings → Roles.',
      };
    }
    return { ok: false, error: `Discord API ${res.status}: ${text}` };
  }

  return { ok: true };
}

export async function removeRole(
  userId: string,
  roleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getBotConfig();
  if (!cfg.ok) return cfg;

  const res = await fetch(
    `${API}/guilds/${cfg.guildId}/members/${userId}/roles/${roleId}`,
    {
      method: 'DELETE',
      headers: botHeaders(cfg.token),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      return {
        ok: false,
        error:
          'Cannot remove role. Bot role must be ABOVE the target role in Server Settings → Roles.',
      };
    }
    return { ok: false, error: `Discord API ${res.status}: ${text}` };
  }

  return { ok: true };
}
