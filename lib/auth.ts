// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      // GitHub の login を取り出して admin 判定等で使えるように
      (session as any).login = (token as any)?.login ?? session.user?.name ?? null;
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.login = (profile as any)?.login ?? token.login;
      }
      return token;
    },
  },
};