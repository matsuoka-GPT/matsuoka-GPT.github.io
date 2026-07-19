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
- `en/` — Compatibility redirects from old `/en/` URLs to their current locations (`/jp/` for the old Japanese home page, root English pages for old English member/gallery pages).

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
3. When adding Japanese home/member/gallery pages, place them under `jp/`; keep English pages at the repository root and update any old `/en/` references to the correct English root or Japanese `/jp/` URL.
4. When moving a public URL, leave a small redirect HTML file at the old path if GitHub Pages must preserve access.
5. Store reusable media under `images/`; use relative paths that resolve from the page location.
6. Update `sitemap.xml` when adding or moving public pages.
7. Before committing, run a local link check over internal `href`/`src` references.

