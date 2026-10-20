import { NextResponse } from 'next/server';
import { clearSessionCookie, getBaseUrl } from '@/lib/auth';

export async function GET() {
  const res = NextResponse.redirect(`${getBaseUrl()}/`);
  clearSessionCookie(res);
  return res;
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
