import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/auth';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: 'DISCORD_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = `${getBaseUrl()}/api/auth/callback/discord`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'identify email',
    redirect_uri: redirectUri,
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
