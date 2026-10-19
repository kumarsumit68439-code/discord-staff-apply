import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function assignDiscordRole(discordUserId: string, roleId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId || !roleId) return { ok: false, error: 'Bot not configured' };

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map((id) => id.trim());
  const userId = (session.user as any).discordId;
  if (!adminIds.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
  }

  const body = await req.json();
  const { status, admin_note, role_id } = body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data: app, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('applications')
    .update({
      status,
      admin_note: admin_note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let roleResult = null;
  if (status === 'approved' && role_id) {
    roleResult = await assignDiscordRole(app.discord_id, role_id);
  } else if (status === 'approved' && process.env.DISCORD_STAFF_ROLE_ID) {
    roleResult = await assignDiscordRole(app.discord_id, process.env.DISCORD_STAFF_ROLE_ID);
  }

  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: status === 'approved' ? 'Application Approved' : 'Application Rejected',
            color: status === 'approved' ? 0x57f287 : 0xed4245,
            fields: [
              { name: 'User', value: `${app.discord_username} (${app.discord_id})`, inline: true },
              { name: 'Position', value: app.position, inline: true },
              { name: 'Status', value: status, inline: true },
              ...(admin_note ? [{ name: 'Admin Note', value: admin_note }] : []),
              ...(roleResult ? [{ name: 'Role Assign', value: roleResult.ok ? 'Success' : `Failed: ${roleResult.error}` }] : []),
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error('Webhook failed', e);
    }
  }

  return NextResponse.json({ application: data, roleResult });
}
