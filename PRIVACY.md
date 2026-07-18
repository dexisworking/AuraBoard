# Privacy Policy

**Last updated: 18 July 2026** · Applies to AuraBoard for Windows, all versions.

AuraBoard is a product of **DexForge** (<https://dexforge.iamdex.codes>), which publishes
and maintains it. DexForge is the party this policy refers to as "we".

## Summary

**AuraBoard collects nothing.** There is no account, no server, no telemetry, no
analytics, and no crash reporting. **DexForge receives no data from your installation** —
not usage statistics, not error reports, not even a count of launches. We operate no
backend for this product, so there is nothing for us to collect data into.

Everything you configure stays on your own machine.

## What is stored, and where

All settings live locally in `%APPDATA%\auraboard\` and never leave your computer:

| Data | Purpose |
|---|---|
| Widget layout, enabled widgets, per-widget settings | Restore your board between sessions |
| Theme, font, idle timeout, slideshow options | Your preferences |
| Wallpaper folder path | Locate your images |
| Weather location (if you set one) | Fetch local weather |
| Calendar `.ics` URL (if you add one) | Fetch your events |
| API keys for News / Stocks / Crypto (optional) | Authenticate your own API accounts |
| Spotify access and refresh tokens (if you connect) | Keep you signed in |

API keys and Spotify tokens are encrypted at rest using Windows DPAPI through
Electron's `safeStorage`, with a per-installation key. They are never transmitted
anywhere except to the service that issued them.

Uninstalling removes the application. To also remove your settings, delete
`%APPDATA%\auraboard\`.

## Network connections

AuraBoard has no backend. Widgets call public APIs **directly from your computer**,
so those services see your IP address the same way any website you visit does. The
DexForge operates no server and cannot see these requests.

Connections are made only for widgets you have enabled:

| Service | When | What is sent |
|---|---|---|
| `open-meteo.com` (weather, geocoding, air quality) | Weather or Sun widget enabled | Your configured city name, or coordinates |
| `ipapi.co` | Only if no manual weather location is set | Nothing but the request itself; your IP is used to estimate your city |
| `accounts.spotify.com`, `api.spotify.com` | Only if you connect Spotify | OAuth (PKCE) and playback commands you trigger |
| `api.coingecko.com` | Crypto widget enabled | The coin IDs you configured |
| `alphavantage.co`, Yahoo Finance | Stocks widget enabled | The ticker symbols you configured |
| `gnews.io`, `feeds.bbci.co.uk` | News widget enabled | Your API key, if you supplied one |
| `thesportsdb.com`, `espn.com` | Sports widget enabled | The league IDs you configured |
| Your calendar provider | Only if you add an `.ics` URL | A request to the URL you provided |
| `github.com` | Update check | Nothing but the request; GitHub sees your IP |

Disabling a widget stops its requests. If you enable no networked widgets and do not
connect Spotify, AuraBoard makes no outbound connections except update checks.

Each service listed above has its own privacy policy, which governs what it does with
requests it receives. AuraBoard has no relationship with, and no visibility into, those
services beyond making the request.

## Spotify

Connecting Spotify uses OAuth 2.0 with PKCE. You sign in on Spotify's own page — your
password is never seen by, entered into, or transmitted through AuraBoard. The resulting
tokens are stored encrypted on your machine and used only to read what is playing and to
send playback commands you initiate. Disconnecting in Settings deletes them.

## Your wallpapers

Images and videos are read from the folder you choose and displayed locally. They are
never uploaded, scanned, indexed, or transmitted. AuraBoard serves them to its own window
through a private protocol restricted to the folders you selected.

## Children

AuraBoard is not directed at children and collects no personal information from anyone,
including children under 13.

## Changes

Material changes to this policy will be published in this file and noted in the release
notes for the version they take effect in.

## Contact

AuraBoard is published by **DexForge** — <https://dexforge.iamdex.codes>.

Questions or privacy requests: open an issue at
<https://github.com/dexisworking/AuraBoard/issues>.

The full source is available at <https://github.com/dexisworking/AuraBoard> — every
claim above can be verified by reading it.
