import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const ALLOW = (process.env.ADMIN_GITHUB_LOGINS || "")
  .split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const login = (profile as any)?.login?.toLowerCase();
      return ALLOW.length === 0 ? false : ALLOW.includes(login);
    },
    async jwt({ token, profile }) {
      if (profile) token.login = (profile as any).login;
      return token;
    },
    async session({ session, token }) {
      (session as any).login = token.login;
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
};
