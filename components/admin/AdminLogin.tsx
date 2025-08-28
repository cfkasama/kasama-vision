"use client";
import { signIn } from "next-auth/react";

export default function AdminLogin() {
  return (
    <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm max-w-md">
      <h2 className="text-lg font-bold">管理ログイン</h2>
      <p className="text-sm text-gray-600">GitHubアカウントでログインしてください。</p>
      <button onClick={()=>signIn("github")} className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-black">
        Sign in with GitHub
      </button>
    </div>
  );
}
