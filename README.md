# AuraBoard

AuraBoard is a Windows ambient screensaver app built with Electron + React. It runs from the system tray, activates on system idle, and overlays useful live widgets on top of a cinematic photo slideshow.

## Highlights

- Idle-activated full-screen screensaver shell
- Local folder slideshow with transition effects and optional shuffle
- Live widgets: clock, date, greeting, weather, and Spotify now playing
- Spotify integration (OAuth + playback controls + optional album-art background)
- Native settings window for tuning behavior without restarting the app

## Tech Stack

- Electron + electron-vite
- React 19
- electron-store for local configuration persistence

## Requirements

- Windows 10/11
- Node.js 20+
- npm
- Spotify account (optional, for music features)

## Getting Started

```bash
git clone https://github.com/dexisworking/AuraBoard.git
cd AuraBoard
npm install
npm run dev
```

## Build

```bash
npm run build
```

Windows distributable:

```bash
npm run build:win
```

## App Behavior

- AuraBoard starts in the tray and continues running when windows are closed.
- Screensaver activation is based on system idle time.
- Settings include idle timeout, slideshow source folder, transition style, interval, and Spotify options.

## Spotify Integration

Spotify login is handled from inside AuraBoard using OAuth (PKCE). Once connected, the app can show now-playing metadata and provide play/pause/skip/volume/shuffle controls.

## Scripts

- `npm run dev` - start development mode
- `npm run build` - build app bundles
- `npm run build:win` - build Windows installer/package
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## License

No license file is currently included. Add a `LICENSE` file before broad distribution if you want to define usage rights clearly.
