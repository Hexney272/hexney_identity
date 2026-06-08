# Preview & store-listing media

This guide shows how to record a clean GIF/MP4 of the Identity Card for a
store listing (Tebex / FiveM forum), without running a FiveM server.

## 1. Open the demo

The NUI runs standalone in any Chromium-based browser. Open:

```
html/index.html?preview=1
```

In `?preview=1` mode the card:

- renders a sample **Mechanic** character (amber accent),
- shows the **online panel** + **business/society panel**,
- runs a showcase loop that **animates the count-up** (money / wage /
  society funds), refreshes the online numbers, and pops an
  **achievement toast** every few seconds.

> The page background is transparent by design. For recording, put a dark
> backdrop behind it (see below) so the glassmorphism reads well.

## 2. Add a backdrop for recording

Create a throwaway `preview.html` next to `index.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>preview</title>
<style>
  html,body{margin:0;height:100%}
  body{background:radial-gradient(circle at 30% 20%,#1b2a4a,#070a12)}
  iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent}
</style>
<iframe src="index.html?preview=1"></iframe>
```

A GTA screenshot as the backdrop sells it even better:
`body{background:url('docs/bg.jpg') center/cover}`.

## 3. Record

**Option A — browser only (GIF):**
- Use the browser devtools "Recorder", or an extension, or
- macOS: `Cmd+Shift+5`; Windows: Xbox Game Bar `Win+G`.

**Option B — OBS (recommended, MP4):**
- Add a *Window/Browser Source* pointing at the preview page,
- 1920×1080, 60 fps, record 8–12 seconds (covers one full count-up +
  one toast), export MP4.

**Option C — headless capture (advanced):**
- Drive Chromium with Puppeteer/Playwright and screen-record the page for
  a deterministic clip.

## 4. Suggested shots for the listing

1. **Hero** — full overlay over a GTA screenshot (card + online + society).
2. **Accent variants** — same card as Police (blue), EMS (red), Civilian.
   Temporarily change the preview `accent` / `groupKey` in `app.js`.
3. **Count-up close-up** — crop to the CASH/BANK rows mid-animation.
4. **Achievement toast** — capture the unlock popup.
5. **Accessibility** — a frame with colorblind palette on (set
   `Config.Colorblind = true`) to show you care about it.

## 5. Tips

- Keep clips **short and looping**; storefronts autoplay muted.
- Show **motion** (count-up, toast, slide-in) — static images undersell it.
- Export a **1:1 or 16:9** crop; avoid ultrawide for thumbnails.
