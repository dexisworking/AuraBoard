# AuraBoard — product fact sheet

Written for the DexForge website session. Everything needed to build the AuraBoard
landing page without re-deriving it from the app repo.

**Product:** AuraBoard · **Publisher:** DexForge · **Version:** 1.0.0 · **Licence:** MIT
**Repo:** https://github.com/dexisworking/auraboard
**Releases:** https://github.com/dexisworking/auraboard/releases/latest

---

## Positioning

**One-liner**
> Your idle screen, turned into a dashboard.

**Short (≤160 chars, for meta description)**
> AuraBoard turns your idle Windows screen into a designed ambient dashboard — a photo
> and video slideshow with 14 live widgets you arrange yourself. Free and open source.

**Paragraph**
> Your machine sits idle for hours a day showing nothing. AuraBoard replaces the blank
> Windows screensaver with something worth glancing at — the time, the weather, your next
> meeting, what's playing — set against your own wallpapers, in a deliberate Swiss-inspired
> visual language rather than the usual widget-soup.

**Three pillars** (for a features grid)
1. **It looks designed.** Ultra-condensed display type, one signal colour on a mono
   ground, hairline rules, square corners. Every widget ships in three visual variants.
2. **It's yours to arrange.** Drag, resize and overlap widgets on a 12×12 grid. Layouts
   persist across restarts.
3. **It stays out of the way.** Lives in the tray, wakes on idle, dismisses on input.

---

## Feature list

| Feature | Detail |
|---|---|
| 14 widgets | Clock · Date · Greeting · Weather · Moon · Sun · Calendar · Countdown · System · Spotify · News · Crypto · Stocks · Sports — each with 3 visual variants |
| Photo & video slideshow | JPEG/PNG/WebP/GIF + MP4/WebM/MOV. Videos loop, always muted |
| Free-form layout editor | Drag, resize from any edge, overlap freely |
| 4 themes | Signal · Newsprint · Cyan · Amber, plus an optional time-of-day palette drift |
| Spotify | Now-playing, transport controls, optional album-art background |
| Multi-monitor | All displays or a chosen subset |
| Photo treatments | Monochrome, duotone, or untouched — tuned for text legibility over any image |
| Privacy | No account, no server, no telemetry. See PRIVACY.md |

**Requirements:** Windows 10 / 11 (x64). No runtime dependencies — everything bundled.

---

## Downloads

Three assets on the v1.0.0 release. **Verify the hashes before publishing them on the
site** — the installers are rebuilt on every `build:win` and each build produces a
different hash. Re-hash from the live release rather than trusting this table if any
time has passed.

| Asset | Size | Notes |
|---|---|---|
| `AuraBoard-Setup-1.0.0.exe` | 80 MB | Standard installer. User brings their own wallpaper folder |
| `AuraBoard-Setup-1.0.0-predefined.exe` | 498 MB | Same app + 4 bundled wallpaper packs (118 files) |
| `AuraBoard-1.0.0-portable.zip` | 109 MB | No installer — extract and run `AuraBoard.exe` |

```
SHA256 (as published, 18 July 2026)
AuraBoard-Setup-1.0.0.exe             4BDCBC8D71EEF1B1F7CD9A937CD84D0A75DCA82F074EAF74AF5A9BD20D9C845C
AuraBoard-Setup-1.0.0-predefined.exe  756903DBED86AFE42D489105D696BD712D7FB7E0D9DBDBF803042AC35E86DABF
AuraBoard-1.0.0-portable.zip          BB2F4C9538C73503155E7B33ACDCFFE2DCBE088678BC51CB4B13980A219DDB82
```

**Stable download URLs** (always resolve to the newest release):

```
https://github.com/dexisworking/auraboard/releases/latest/download/AuraBoard-Setup-1.0.0.exe
https://github.com/dexisworking/auraboard/releases/latest/download/AuraBoard-1.0.0-portable.zip
```

Note these embed the version, so they break on the next release. For a version-agnostic
CTA, link to `/releases/latest` and let the user pick.

### The download problem the page must address

**The installers are not code-signed.** Browser SmartScreen discards unsigned executables
from publishers with no download reputation — Chrome deletes them outright, without a
prompt the user can act on. Microsoft Defender scans the binary clean; this is a
reputation filter, not a malware verdict.

The landing page should say so plainly rather than let users conclude the download is
broken or malicious. Recommended copy:

> Windows may warn you or remove the download — the installer isn't code-signed yet, so
> SmartScreen filters it on reputation. Defender scans it clean. Choose **Keep** in your
> browser, then **More info → Run anyway**, or use the portable ZIP, which is rarely
> blocked.

Surfacing the SHA-256s on the page materially helps here — it gives a cautious user a way
to verify rather than trust.

---

## Assets available

Screenshots, already generated and committed in this repo:

| File | What it shows |
|---|---|
| `docs/screenshots/board-signal.png` | The board, Signal (dark) theme — the hero shot |
| `docs/screenshots/board-newsprint.png` | The board, Newsprint (light) theme |
| `docs/screenshots/settings.png` | Settings window |
| `docs/screenshots/settings-background.png` | Background/packs configuration |
| `assets/banner.png` | 1280×440 Swiss banner with wordmark |

All render the real components at 1.5–2× DPI. Backgrounds in the board shots are a
generated gradient, not a bundled wallpaper, so nothing copyrighted appears in them.

---

## Brand notes for the page

AuraBoard's own visual language is Swiss/Brutalist: Anton (display), Archivo Variable
(numerals, tabular), JetBrains Mono (micro captions), signal red `#FF2B12` on `#0A0A0A`.
That is **AuraBoard's** system, not DexForge's — the site is Inter 800 on `#050505` with
`#DC2626`. Don't import AuraBoard's typography into the DexForge site; represent the
product through its screenshots and keep the page in DexForge's own system.

In-app, DexForge is credited in three places: the Settings titlebar byline, an About
section (version + update state + wordmark linking to the site), and the first-run
onboarding screen. The wordmark uses DexForge's two-tone form — "Dex" in the app's ink
colour, "Forge" in the app's accent — so it re-themes rather than clashing.

---

## Suggested page structure

1. **Hero** — one-liner, board screenshot, primary CTA (download) + secondary (GitHub)
2. **Three pillars** — the cards above
3. **Feature grid** — the 14 widgets, themes, video wallpapers
4. **Screenshot section** — board in two themes, settings
5. **Download** — the three-asset table, SHA-256s, and the SmartScreen note
6. **Open source** — MIT, link to repo, "build it yourself" snippet
7. **Privacy** — one line: no account, no server, no telemetry, link to PRIVACY.md
