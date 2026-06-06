// Auth.js options: generic OIDC provider → Gitea.
// Gitea acts as the OIDC issuer; it in turn can federate to your company IdP.

import type { NextAuthOptions } from "next-auth";

// Internal URL: server-side API + token exchange (container network in Docker).
const GITEA_URL = process.env.GITEA_URL ?? "http://localhost:3001";
// Public URL: browser-facing authorize redirect. Falls back to internal.
const GITEA_PUBLIC_URL = process.env.GITEA_PUBLIC_URL ?? GITEA_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "gitea",
      name: "Sign in",
      type: "oauth",
      authorization: {
        // Browser is redirected here — must be reachable from the user's browser
        url: `${GITEA_PUBLIC_URL}/login/oauth/authorize`,
        params: { scope: "openid profile email" },
      },
      // Token exchange + userinfo happen server-side — use the internal URL
      token: `${GITEA_URL}/login/oauth/access_token`,
      userinfo: `${GITEA_URL}/api/v1/user`,
      clientId: process.env.OIDC_CLIENT_ID ?? "ai-asset-hub-web",
      clientSecret: process.env.OIDC_CLIENT_SECRET ?? "",
      profile(profile: {
        id: number;
        login: string;
        full_name: string;
        email: string;
        avatar_url: string;
      }) {
        return {
          id: String(profile.id),
          name: profile.full_name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          login: profile.login,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Store the Gitea access token in the JWT so API calls use it
      if (account?.access_token) {
        token.giteaToken = account.access_token;
      }
      if (profile) {
        const p = profile as { login?: string };
        token.login = p.login ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose to the client session
      const s = session as typeof session & {
        giteaToken?: string;
        user: { login?: string };
      };
      s.giteaToken = token.giteaToken as string | undefined;
      s.user.login = token.login as string | undefined;
      return s;
    },
  },

  pages: {
    signIn: "/",
  },

  session: {
    strategy: "jwt",
  },
};
