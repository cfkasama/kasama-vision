// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// ← Node ランタイム必須（Prisma/crypto 使うなら特に）
export const runtime = "nodejs";

export const authOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true, // 任意
    }),
  ],
  // 必要なら callbacks / pages / session などここに
};

const handler = NextAuth(authOptions);

// ★ App Router では GET/POST を両方 export する
export { handler as GET, handler as POST };