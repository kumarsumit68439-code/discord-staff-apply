import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  getBaseUrl,
  setSessionCookie,
  isBanned,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();
  const code = req.nextUrl.searchParams.get('code');
  const oauthError = req.nextUrl.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/?error=config`);
  }

  const redirectUri = `${baseUrl}/api/auth/callback/discord`;

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Discord token error:', text);
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('Discord user error:', await userRes.text());
      return NextResponse.redirect(`${baseUrl}/?error=user_fetch`);
    }

    const user = await userRes.json();
    const discordId = user.id as string;
    const discordUsername = (user.global_name || user.username || 'User') as string;
    const discordAvatar = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null;

    if (await isBanned(discordId)) {
      return NextResponse.redirect(`${baseUrl}/?error=banned`);
    }

    const sessionToken = await createSessionToken({
      discordId,
      discordUsername,
      discordAvatar,
    });

    const res = NextResponse.redirect(`${baseUrl}/`);
    setSessionCookie(res, sessionToken);
    return res;
  } catch (e) {
    console.error('OAuth callback error:', e);
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`);
  }
}
