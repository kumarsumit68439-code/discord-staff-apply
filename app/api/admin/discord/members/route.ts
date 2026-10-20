import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { fetchGuildMembers, fetchGuildRoles } from '@/lib/discord';

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [membersRes, rolesRes] = await Promise.all([
    fetchGuildMembers(),
    fetchGuildRoles(),
  ]);

  if (!membersRes.ok) {
    return NextResponse.json({ error: membersRes.error }, { status: 500 });
  }

  return NextResponse.json({
    members: membersRes.members,
    roles: rolesRes.ok ? rolesRes.roles : [],
    rolesError: rolesRes.ok ? null : rolesRes.error,
  });
}
