import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { addRole, removeRole } from '@/lib/discord';

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { action, user_id, role_id } = body as {
    action: 'add' | 'remove';
    user_id: string;
    role_id: string;
  };

  if (!action || !user_id || !role_id) {
    return NextResponse.json(
      { error: 'action, user_id and role_id required' },
      { status: 400 }
    );
  }

  if (action === 'add') {
    const result = await addRole(user_id, role_id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: 'Role added on Discord' });
  }

  if (action === 'remove') {
    const result = await removeRole(user_id, role_id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: 'Role removed on Discord' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
