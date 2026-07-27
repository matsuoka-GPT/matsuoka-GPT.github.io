# Matsuoka × GPT Thought Experiment Lab website

Static GitHub Pages site for publishing the Matsuoka × GPT Thought Experiment Lab, its Zenodo outputs, essays, member pages, and structure-art viewers.

## Site structure

- `index.html` — English home page. It contains the main navigation, project/output sections, essay index, structured data, and language switch to `/jp/`.
- `jp/` — Japanese-language section. `jp/index.html` is the Japanese home page, with Japanese member and structure-art gallery pages in the same folder.
- `members.html` and `jp/members.html` — English/Japanese member pages.
- `structure-art-gallery.html` and `jp/structure-art-gallery.html` — English/Japanese structure-art gallery pages.
- `essays/` — Standalone essay pages. Files ending in `-en` are English pages, and files ending in `-jp` are Japanese pages.
- `viewer/` — Standalone structure-art media viewers linked from the gallery pages.
- `images/` and `images/thumbs/` — Shared images, thumbnails, and video files used by home pages, essays, galleries, and viewers.
- `sitemap.xml` and `robots.txt` — Search-engine discovery files for GitHub Pages.
- `en/` — Compatibility redirects from old `/en/` English URLs to the root English URLs.

## Main pages

- English home: `/`
- Japanese home: `/jp/`
- English members: `/members.html`
- Japanese members: `/jp/members.html`
- English structure-art gallery: `/structure-art-gallery.html`
- Japanese structure-art gallery: `/jp/structure-art-gallery.html`
- Essays: `/essays/<essay-file>.html`
- Structure-art viewers: `/viewer/<viewer-file>.html`

## Updating the site

1. Edit the relevant static HTML file directly.
2. Keep language-specific home links consistent: English pages should point to `/` or `/index.html`; Japanese pages should point to `/jp/` or `/jp/index.html`.
3. When adding Japanese home/member/gallery pages, place them under `jp/` and update any old Japanese-page references to `/jp/`.
4. When moving a public URL, leave a small redirect HTML file at the old path if GitHub Pages must preserve access.
5. Store reusable media under `images/`; use relative paths that resolve from the page location.
6. Update `sitemap.xml` when adding or moving public pages.
7. Before committing, run a local link check over internal `href`/`src` references.

## 共通テーマ（Dark / Light）

全HTMLページは、フレームワークに依存しない共通テーマを利用します。右上の
`◐ System` / `☀ Light` / `🌙 Dark` ボタンで3モードを順番に切り替えられ、選択内容は
`localStorage` の `site-theme` に保存されます。初回アクセスは`System`モードとなり、
`prefers-color-scheme`に従います。System選択中はOS設定の変更にもリアルタイムで追従します。

### 新規追加ファイル

- `styles/theme.css` — ライト／ダーク両テーマのCSS変数、研究コンテンツ向け配色、切替時のトランジション、切替ボタンのレスポンシブ表示を管理します。
- `scripts/theme.js` — 初期テーマの早期適用、切替ボタンの生成、設定保存、OS設定変更への追従を管理します。

### 変更したファイル一覧

- ルートHTML: `index.html`、`members.html`、`structure-art-gallery.html`、`zenodo-stats.html`
- 日本語・英語ページ: `jp/*.html`、`en/*.html`
- 徒然小論文: `essays/*.html`、`essays/*.htm`（日本語・英語の全ページ）
- 構造アートビューア: `viewer/*.html`
- ドキュメント: `README.md`

各HTMLの`head`末尾で共通CSSとJavaScriptを読み込みます。相対パスはページの
階層に合わせて設定しているため、GitHub Pages上でもビルド処理なしで動作します。

### 修正内容と今後拡張しやすい構成

- 色は`--bg-color`、`--text-color`、`--card-color`、`--surface-color`、
  `--muted-color`、`--border-color`、`--link-color`などの役割別変数に集約しました。
- ダーク配色は`[data-theme="dark"]`に限定しているため、既存のライトテーマの
  レイアウト、余白、フォント、文章構成には影響しません。
- 配色変更は原則として`styles/theme.css`の変数だけで行えます。テーマ処理や
  保存キーを変更する場合は`scripts/theme.js`だけを編集します。
- 新規HTMLを追加するときは、閉じ`head`タグの直前で階層に応じたパスの
  `styles/theme.css`と`scripts/theme.js`を読み込むだけでテーマ対応できます。


## IndexNow automatic submission

This site uses a GitHub Actions workflow to deploy the static GitHub Pages artifact and submit changed public HTML URLs to IndexNow when changes are pushed to `main`.

### GitHub Secret setup

1. Generate an IndexNow key that follows the official key format: 8–128 hexadecimal characters (`a-f`, `0-9`).
2. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Create a repository secret named `INDEXNOW_KEY` and paste the generated key as the value.
4. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions** so the workflow artifact is what GitHub Pages publishes.

The workflow writes a root-level `{INDEXNOW_KEY}.txt` file into the Pages artifact at deploy time. For example, if the secret value is `abc123...`, GitHub Pages publishes `https://matsuoka-gpt.github.io/abc123....txt` containing that key. The key value itself is not committed to the repository.

### How it works

- The workflow runs on every push to `main`.
- It compares the pushed commit with the previous commit from the GitHub push event.
- It extracts only changed public `.html` and `.htm` files, including deleted and renamed paths where Git can report them.
- It converts repository paths to public URLs under `https://matsuoka-gpt.github.io/`; for example, `jp/index.html` becomes `https://matsuoka-gpt.github.io/jp/index.html`.
- It removes duplicate URLs within the same run, then sends a JSON POST request to `https://api.indexnow.org/indexnow`.
- HTTP `200` and `202` are treated as success. HTTP `400`, `403`, `422`, and `429` print likely causes in the workflow log.

### Operation check

1. Confirm the latest workflow run for `main` completed successfully in the GitHub **Actions** tab.
2. Open the deployed key file URL, `https://matsuoka-gpt.github.io/{INDEXNOW_KEY}.txt`, and confirm it returns the key value.
3. Edit or add a public HTML file, merge it to `main`, and check the **Submit changed HTML URLs to IndexNow** step log.
4. Confirm the log lists only the changed HTML page URLs and ends with HTTP `200` or `202`.
