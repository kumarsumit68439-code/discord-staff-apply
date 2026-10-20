import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!.trim(),
      clientSecret: process.env.DISCORD_CLIENT_SECRET!.trim(),
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
      // Avoid openid-client issuer discovery issues with Discord
      checks: ['state'],
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const p = profile as {
          id: string;
          username?: string;
          global_name?: string;
          image_url?: string;
          avatar?: string;
        };
        token.discordId = p.id;
        token.discordUsername = p.username || p.global_name || 'User';
        token.discordAvatar = p.image_url
          ? p.image_url
          : p.avatar
            ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
            : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).discordId = token.discordId as string;
        (session.user as any).discordUsername = token.discordUsername as string;
        (session.user as any).discordAvatar = token.discordAvatar as string | null;
        if (token.discordUsername) {
          session.user.name = token.discordUsername as string;
        }
        if (token.discordAvatar) {
          session.user.image = token.discordAvatar as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
