import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getYoutubeKey(): string {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.YT_API_KEY ||
    process.env.GOOGLE_YOUTUBE_API_KEY ||
    ''
  ).trim();
}

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user || !(await isAdmin(user.discordId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'q required' }, { status: 400 });
  }

  const key = getYoutubeKey();
  if (!key) {
    // Debug: which env names exist (not values)
    const has = {
      YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
      YT_API_KEY: !!process.env.YT_API_KEY,
      GOOGLE_YOUTUBE_API_KEY: !!process.env.GOOGLE_YOUTUBE_API_KEY,
    };
    return NextResponse.json(
      {
        error:
          'YOUTUBE_API_KEY runtime me nahi mili. Vercel → Settings → Environment Variables → key name exactly YOUTUBE_API_KEY, Environment = Production, phir Deployments → Redeploy (Use existing Build Cache = OFF).',
        envCheck: has,
      },
      { status: 500 }
    );
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '8');
  url.searchParams.set('q', q);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error?.errors?.[0]?.message ||
      `YouTube API ${res.status}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const items = (data.items || [])
    .filter((it: any) => it?.id?.videoId)
    .map((it: any) => ({
      videoId: it.id.videoId as string,
      title: (it.snippet?.title as string) || 'Untitled',
      channel: (it.snippet?.channelTitle as string) || '',
      thumb:
        (it.snippet?.thumbnails?.default?.url as string) ||
        (it.snippet?.thumbnails?.medium?.url as string) ||
        null,
    }));

  return NextResponse.json({ items });
}
