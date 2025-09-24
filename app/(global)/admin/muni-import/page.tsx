// app/admin/muni-import/page.tsx
"use client";

import { useRef, useState } from "react";

export const dynamic = "force-dynamic";

export default function MuniImportPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const fd = new FormData(formRef.current!);

    // 必要ならADMIN_SECRETをヘッダで送る（API側と合わせて）
    const res = await fetch("/api/admin/muni-import", {
      method: "POST",
      body: fd,
      headers: {
        // "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "" // 環境変数に露出させたくなければ削除
      }
    });

    const j = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !j?.ok) {
      setMsg(`失敗: ${j?.error || res.statusText}`);
      return;
    }
    setMsg(`成功: ${j.total} 件を ${j.mode} しました`);
    formRef.current?.reset();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Municipality インポート</h1>
      <p className="text-sm text-gray-600">
        ヘッダは <code>name,slug,prefecture,code</code> の順でUTF-8 CSV。
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-4">
        <label className="block text-sm">
          CSVファイル（UTF-8）
          <input name="file" type="file" accept=".csv,text/csv" required className="mt-1 block w-full rounded border p-2" />
        </label>

        <label className="block text-sm">
          モード
          <select name="mode" defaultValue="upsert" className="mt-1 rounded border p-2">
            <option value="upsert">upsert（既存に上書き/なければ追加）</option>
            <option value="replace">replace（全削除→追加）※注意</option>
          </select>
        </label>

        <button
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "処理中…" : "インポート実行"}
        </button>

        {msg && <p className="text-sm">{msg}</p>}
      </form>

      <details className="rounded-lg border bg-gray-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium">サンプルCSV</summary>
        <pre className="overflow-auto">
name,slug,prefecture,code
"茨城県",08-000,"茨城県",08000
"笠間市",08216,"茨城県",08216
"水戸市",08201,"茨城県",08201
"東京都",13-000,"東京都",13000
"千代田区",13101,"東京都",13101
        </pre>
      </details>
    </div>
  );
}
