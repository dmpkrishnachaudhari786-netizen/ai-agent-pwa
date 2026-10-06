# AI Agent — Command Console (PWA)

An installable web app that runs real device actions from Hindi / Hinglish / English
voice or text commands. Built as the web/PWA counterpart of the Android AI-Agent prototype.

**Live app:** https://dmpkrishnachaudhari786-netizen.github.io/ai-agent-pwa/

## Install it on your phone

1. Open the live link in **Chrome on Android**.
2. Tap the **install** icon in the app header (or Chrome menu → *Add to Home screen*).
3. It opens full-screen like a native app and works offline.

## What actually works

| Feature | Status |
|---|---|
| Text commands (Hindi / Hinglish / English) | ✅ Real |
| Voice input (Web Speech API) | ✅ Real |
| Open installed Android apps (`open_app`) via intent links | ✅ Real |
| Web search (`search_web`) | ✅ Real |
| Back navigation (`press_back`) | ✅ Real (in-app history) |
| Free-form AI chat + AI tool selection (bring your own key) | ✅ Real |
| Tool debug panel | ✅ Real |
| Offline app shell (service worker) | ✅ Real |
| Install to home screen (PWA) | ✅ Real |

## What a web app genuinely cannot do

- **System Home button** — browsers block apps from pressing it. The agent says so honestly instead of faking it.
- **Enumerating your installed apps** — the browser sandbox forbids it. A curated app registry (package name + web fallback) is used instead.
- **Your YouTube account videos** — requires Google OAuth, which is not configured. The tool returns `OAUTH_SETUP_REQUIRED`; it never returns fake data.

## AI engine (optional)

Offline mode understands the built-in commands with no key. For free-form questions,
open **Settings** and add your own API key for either:

- **Google Gemini** (`generativelanguage.googleapis.com`), or
- any **OpenAI-compatible** endpoint (base URL + key + model).

The key is stored only in your browser's `localStorage` and is sent directly to the
provider you choose. It is never sent anywhere else. No key is baked into this repo.

## Run locally

```bash
cd ai-agent-pwa
python3 -m http.server 8080
# open http://localhost:8080
```

## Files

```
index.html            app shell + settings sheet
styles.css            design tokens and layout
app.js                command parser, tool executor, AI brain, UI
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline shell)
icons/                app icons
```

## Safety

The tool executor only accepts a fixed allow-list of tools
(`open_app`, `search_web`, `go_home`, `press_back`, `list_youtube_videos`) and validates
arguments before acting. There is no shell access, no root, no hidden API and no security bypass.
