# みんなで考える笠間の未来（MVP）

Next.js App Router + Tailwind + Neon(Postgres) + Prisma + NextAuth(GitHub)

## セットアップ

1. 依存インストール
```bash
pnpm i
```

2. `.env.local` を作成（`.env.local.example` をコピーして値を入れる）

3. Prisma 初期化
```bash
pnpm prisma:gen
pnpm prisma:migrate
```

4. 開発起動
```bash
pnpm dev
```

## 機能
- 投稿/一覧/詳細/コメント/いいね/推薦（推薦10で提案化）
- 3ボタン（住みたい/働きたい/行きたい）→ドラフト遷移
- 通報キュー＆処理（削除/復元/対応済み）
- 公開モデログ `/modlog`
- 監査ログ（管理画面タブ）
- ホット順＆タグTOP5の定期更新（/api/jobs/recalc, Vercel Cron）
- 管理ログイン：GitHub許可リスト（`ADMIN_GITHUB_LOGINS`）

## 備考
- Vercel Cron は `vercel.json` を参照。`__CRON_SECRET__` を置換または `.env.local` の `CRON_SECRET` を使う。
- reCAPTCHA v3 の Site Key/Secret を設定してから投稿できる。
