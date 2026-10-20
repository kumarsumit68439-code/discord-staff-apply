import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export type SessionUser = {
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
};

const COOKIE_NAME = 'staff_session';

/** Owner — only this user is hard-coded super admin */
export const OWNER_DISCORD_ID = '1487343086198853785';

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.discordId || typeof payload.discordId !== 'string') return null;
    return {
      discordId: payload.discordId,
      discordUsername: (payload.discordUsername as string) || 'User',
      discordAvatar: (payload.discordAvatar as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function setSessionCookie(res: NextResponse, token: string) {
  const isSecure = getBaseUrl().startsWith('https://');
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse) {
  const isSecure = getBaseUrl().startsWith('https://');
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** Owner always admin; also env list + site_admins table */
export async function isAdmin(discordId: string): Promise<boolean> {
  if (discordId === OWNER_DISCORD_ID) return true;

  const envIds = (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (envIds.includes(discordId)) return true;

  const { data } = await supabase
    .from('site_admins')
    .select('discord_id')
    .eq('discord_id', discordId)
    .maybeSingle();

  return !!data;
}

export async function isOwner(discordId: string): Promise<boolean> {
  return discordId === OWNER_DISCORD_ID;
}

export async function isBanned(discordId: string): Promise<boolean> {
  if (discordId === OWNER_DISCORD_ID) return false;
  const { data } = await supabase
    .from('site_bans')
    .select('discord_id')
    .eq('discord_id', discordId)
    .maybeSingle();
  return !!data;
}

export { COOKIE_NAME };
