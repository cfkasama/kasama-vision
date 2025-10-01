// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const ADMIN_LOGINS = (process.env.ADMIN_GITHUB_LOGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean); // 例: "owner1,owner2"

export function isAdminLogin(login?: string | null) {
  return login ? ADMIN_LOGINS.includes(login) : false;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" }, // ← DB不要
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // プロファイルの login を取りたいので scope はデフォルトでOK
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      // GitHub 認証直後だけ profile が入るので、その時に login を保存
      if (profile && (profile as any).login) {
        (token as any).login = (profile as any).login;
      }
      return token;
    },
    async session({ session, token }) {
      // session に login を引き継ぐ
      if (token && (token as any).login) {
        (session as any).login = (token as any).login;
      }
      return session;
    },
    // 管理画面などをさらに厳しくするなら、ここで signIn を制限してもOK
    // async signIn({ profile }) {
    //   const login = (profile as any)?.login as string | undefined;
    //   return isAdminLogin(login);
    // },
  },
  // 必須: NEXTAUTH_SECRET を設定
};