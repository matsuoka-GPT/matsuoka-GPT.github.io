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
