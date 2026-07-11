# sigil configurator

A tiny, zero-build visual playground for building your card URLs by clicking:
pick a card, enter a username, choose a theme, toggle options, and copy the
ready-made **Markdown / HTML / URL**. Includes a live preview and a theme
gallery.

It's a single self-contained `index.html` — no build step, no dependencies —
so it deploys to Cloudflare Pages (or any static host / GitHub Pages) as-is.

## Use it

1. Open `index.html` (locally: just open the file, or `npx serve configurator`).
2. Paste your sigil instance URL (e.g. `https://sigil.<you>.workers.dev`, or
   `http://127.0.0.1:8787` when running `pnpm dev`) into the **instance URL**
   field — the preview and gallery load live from it.
3. Configure, then copy the snippet into your profile README.

## Deploy to Cloudflare Pages

```bash
wrangler pages deploy configurator --project-name sigil-configurator
```

Or point any static host at the `configurator/` directory.
