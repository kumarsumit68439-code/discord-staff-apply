import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  isAdmin,
  isOwner,
  OWNER_DISCORD_ID,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [adminsRes, bansRes] = await Promise.all([
    supabase.from('site_admins').select('*').order('created_at', { ascending: false }),
    supabase.from('site_bans').select('*').order('created_at', { ascending: false }),
  ]);

  // Always show owner in admins list
  const admins = adminsRes.data || [];
  if (!admins.some((a) => a.discord_id === OWNER_DISCORD_ID)) {
    admins.unshift({
      discord_id: OWNER_DISCORD_ID,
      discord_username: 'Owner',
      added_by: 'system',
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    admins,
    bans: bansRes.data || [],
    isOwner: user.discordId === OWNER_DISCORD_ID,
    ownerId: OWNER_DISCORD_ID,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { action, discord_id, discord_username, reason } = body as {
    action: 'add_admin' | 'remove_admin' | 'ban' | 'unban';
    discord_id: string;
    discord_username?: string;
    reason?: string;
  };

  if (!action || !discord_id || !/^\d{15,20}$/.test(discord_id)) {
    return NextResponse.json({ error: 'Valid Discord ID required' }, { status: 400 });
  }

  // Owner cannot be banned or removed
  if (discord_id === OWNER_DISCORD_ID) {
    return NextResponse.json({ error: 'Cannot modify Owner' }, { status: 400 });
  }

  // Only owner can add/remove admins
  if ((action === 'add_admin' || action === 'remove_admin') && !(await isOwner(user.discordId))) {
    return NextResponse.json({ error: 'Only Owner can manage admins' }, { status: 403 });
  }

  if (action === 'add_admin') {
    const { error } = await supabase.from('site_admins').upsert({
      discord_id,
      discord_username: discord_username || null,
      added_by: user.discordId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'Admin added' });
  }

  if (action === 'remove_admin') {
    const { error } = await supabase.from('site_admins').delete().eq('discord_id', discord_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'Admin removed' });
  }

  if (action === 'ban') {
    // Remove from admins if banned
    await supabase.from('site_admins').delete().eq('discord_id', discord_id);
    const { error } = await supabase.from('site_bans').upsert({
      discord_id,
      discord_username: discord_username || null,
      reason: reason || null,
      banned_by: user.discordId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'User banned' });
  }

  if (action === 'unban') {
    const { error } = await supabase.from('site_bans').delete().eq('discord_id', discord_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: 'User unbanned' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
