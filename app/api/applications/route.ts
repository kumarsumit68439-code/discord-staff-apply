import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin, isBanned } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await isBanned(user.discordId)) {
    return NextResponse.json({ error: 'You are banned' }, { status: 403 });
  }

  const admin = await isAdmin(user.discordId);

  if (admin) {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ applications: data, isAdmin: true });
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('discord_id', user.discordId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ applications: data, isAdmin: false });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await isBanned(user.discordId)) {
    return NextResponse.json({ error: 'You are banned from this site' }, { status: 403 });
  }

  const body = await req.json();
  const { position, experience, why_join, age, timezone, extra } = body;

  if (!position || !experience || !why_join) {
    return NextResponse.json(
      { error: 'Position, experience and why_join are required' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('discord_id', user.discordId)
    .eq('position', position)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending application for this position' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      discord_id: user.discordId,
      discord_username: user.discordUsername,
      discord_avatar: user.discordAvatar,
      position,
      experience,
      why_join,
      age: age ? Number(age) : null,
      timezone: timezone || null,
      extra: extra || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: 'New Staff Application',
              color: 0x5865f2,
              fields: [
                {
                  name: 'User',
                  value: `${user.discordUsername} (${user.discordId})`,
                  inline: true,
                },
                { name: 'Position', value: position, inline: true },
                { name: 'Experience', value: experience.slice(0, 500) },
                { name: 'Why Join', value: why_join.slice(0, 500) },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (e) {
      console.error('Webhook failed', e);
    }
  }

  return NextResponse.json({ application: data });
}
