import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      // scope等が要ればここに
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // GitHub の login を session に載せる
      if (token && typeof token.login === "string") {
        (session as any).login = token.login;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile && (profile as any).login) {
        token.login = (profile as any).login;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isAdmin(session: any) {
  const allow = (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const login = (session as any)?.login ?? session?.user?.name ?? "";
  return allow.includes(login);
}