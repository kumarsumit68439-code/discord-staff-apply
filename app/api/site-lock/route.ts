import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const UNLOCK_COOKIE = 'site_unlock';

async function getSettings() {
  const { data } = await supabase
    .from('site_settings')
    .select('locked, lock_password, updated_at, updated_by')
    .eq('id', 'main')
    .maybeSingle();

  return {
    locked: !!data?.locked,
    hasPassword: !!(data?.lock_password && String(data.lock_password).length > 0),
    lock_password: data?.lock_password ? String(data.lock_password) : '',
    updated_at: data?.updated_at || null,
    updated_by: data?.updated_by || null,
  };
}

/** GET — lock status (no password leaked). Admins also get admin view flag. */
export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  const settings = await getSettings();
  const admin = user ? await isAdmin(user.discordId) : false;

  const unlocked =
    req.cookies.get(UNLOCK_COOKIE)?.value === '1' || admin;

  return NextResponse.json({
    locked: settings.locked,
    hasPassword: settings.hasPassword,
    needsUnlock: settings.locked && !unlocked,
    isAdmin: admin,
    unlocked: unlocked || !settings.locked,
  });
}

/** POST — unlock with password, or admin set lock */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  // User unlock with password
  if (action === 'unlock') {
    const password = String(body.password || '');
    const settings = await getSettings();

    if (!settings.locked) {
      return NextResponse.json({ ok: true, message: 'Site is not locked' });
    }

    if (!settings.lock_password || password !== settings.lock_password) {
      return NextResponse.json({ error: 'Galat password' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, message: 'Unlocked' });
    const isSecure = (process.env.NEXTAUTH_URL || '').startsWith('https');
    res.cookies.set(UNLOCK_COOKIE, '1', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    return res;
  }

  // Admin only below
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'set_lock') {
    const locked = !!body.locked;
    const password =
      body.password !== undefined && body.password !== null
        ? String(body.password).trim()
        : undefined;

    const update: Record<string, unknown> = {
      locked,
      updated_at: new Date().toISOString(),
      updated_by: user.discordId,
    };

    if (password !== undefined) {
      update.lock_password = password.length > 0 ? password : null;
    }

    // If locking without existing password and no new password → require password
    if (locked) {
      const current = await getSettings();
      const finalPass =
        password !== undefined ? password : current.lock_password;
      if (!finalPass) {
        return NextResponse.json(
          { error: 'Lock karne se pehle password set karo' },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: 'main', ...update });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: locked ? 'Website locked' : 'Website unlocked',
      locked,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
