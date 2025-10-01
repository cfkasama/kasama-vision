// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // （必要なら scope 追加）
    }),
  ],
  // 管理者制御の例（login/username で絞る場合）
  callbacks: {
    async signIn({ profile }) {
      // 例: 特定の GitHub ユーザーのみ許可
      // return profile?.login === "your-github-login";
      return true;
    },
    async session({ session, token }) {
      // 便利: GitHub login を session に載せる
      if (token?.login) (session as any).login = token.login;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.login) token.login = (profile as any).login;
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };