/* ==========================================================================
   AI Agent — Command Console (PWA)
   Everything visible here really runs. No mock data, no fake actions.
   ========================================================================== */
'use strict';

/* ----------------------------- Settings store ---------------------------- */
const STORE_KEY = 'aiagent.settings.v1';
const DEFAULT_SETTINGS = {
  provider: 'none',      // 'none' | 'gemini' | 'openai'
  apiKey: '',
  model: '',
  baseUrl: 'https://api.openai.com/v1',
  debug: false,
  webFallback: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
function saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
}
let settings = loadSettings();

/* --------------------------- App registry -------------------------------- */
/* Real package names + web fallbacks. Launching uses Android intent links.   */
const APP_REGISTRY = {
  youtube:    { label: 'YouTube',    pkg: 'com.google.android.youtube',     web: 'https://m.youtube.com',            aliases: ['yt', 'youtube', 'यूट्यूब', 'यूटयूब'] },
  instagram:  { label: 'Instagram',  pkg: 'com.instagram.android',          web: 'https://www.instagram.com',        aliases: ['insta', 'instagram', 'इंस्टाग्राम', 'इन्स्टा', 'इन्स्टाग्राम'] },
  chrome:     { label: 'Chrome',     pkg: 'com.android.chrome',             web: 'https://www.google.com',           aliases: ['chrome', 'क्रोम', 'browser', 'ब्राउज़र'] },
  facebook:   { label: 'Facebook',   pkg: 'com.facebook.katana',            web: 'https://www.facebook.com',         aliases: ['fb', 'facebook', 'फेसबुक'] },
  whatsapp:   { label: 'WhatsApp',   pkg: 'com.whatsapp',                   web: 'https://web.whatsapp.com',         aliases: ['whatsapp', 'wa', 'व्हाट्सएप', 'वाट्सएप'] },
  x:          { label: 'X',          pkg: 'com.twitter.android',            web: 'https://x.com',                    aliases: ['x', 'twitter', 'ट्विटर'] },
  telegram:   { label: 'Telegram',   pkg: 'org.telegram.messenger',         web: 'https://web.telegram.org',         aliases: ['telegram', 'tg', 'टेलीग्राम'] },
  spotify:    { label: 'Spotify',    pkg: 'com.spotify.music',              web: 'https://open.spotify.com',         aliases: ['spotify', 'स्पॉटिफाई'] },
  gmail:      { label: 'Gmail',      pkg: 'com.google.android.gm',          web: 'https://mail.google.com',          aliases: ['gmail', 'mail', 'email', 'जीमेल', 'मेल'] },
  maps:       { label: 'Maps',       pkg: 'com.google.android.apps.maps',   web: 'https://maps.google.com',          aliases: ['maps', 'map', 'नक्शा', 'मैप्स'] },
  camera:     { label: 'Camera',     pkg: 'com.android.camera2',            web: '',                                  aliases: ['camera', 'कैमरा'] },
  settings:   { label: 'Settings',   pkg: 'com.android.settings',           web: '',                                  aliases: ['settings', 'setting', 'सेटिंग', 'सेटिंग्स'] },
  calculator: { label: 'Calculator', pkg: 'com.google.android.calculator',  web: '',                                  aliases: ['calculator', 'calc', 'कैलकुलेटर'] },
  playstore:  { label: 'Play Store', pkg: 'com.android.vending',            web: 'https://play.google.com/store',    aliases: ['play', 'playstore', 'play store', 'प्ले स्टोर'] },
  photos:     { label: 'Photos',     pkg: 'com.google.android.apps.photos',  web: 'https://photos.google.com',        aliases: ['photos', 'gallery', 'फोटो', 'गैलरी'] },
  youtube_music: { label: 'YouTube Music', pkg: 'com.google.android.apps.youtube.music', web: 'https://music.youtube.com', aliases: ['yt music', 'youtube music', 'यूट्यूब म्यूजिक'] },
  drive:      { label: 'Drive',      pkg: 'com.google.android.apps.docs',   web: 'https://drive.google.com',         aliases: ['drive', 'google drive', 'ड्राइव'] },
};

function resolveApp(name) {
  if (!name) return null;
  const n = normalize(name);
  if (!n) return null;
  // exact key / alias
  for (const [key, e] of Object.entries(APP_REGISTRY)) {
    if (key === n) return { key, ...e };
    if (e.aliases.some(a => normalize(a) === n)) return { key, ...e };
  }
  // containment
  for (const [key, e] of Object.entries(APP_REGISTRY)) {
    if (n.includes(key) || key.includes(n)) return { key, ...e };
    if (e.aliases.some(a => n.includes(normalize(a)) || normalize(a).includes(n))) return { key, ...e };
  }
  return null;
}

/* ------------------------------ Text utils ------------------------------- */
function normalize(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------------------- Command parser ----------------------------- */
const OPEN_WORDS = ['open', 'kholo', 'khol', 'kholna', 'kholiye', 'launch', 'start', 'chalu', 'chalao', 'चालू', 'खोलो', 'खोल', 'खोलना', 'खोलिए', 'शुरू', 'ओपन', 'चलाओ', 'चला', 'दिखाओ'];
const HOME_WORDS = ['home', 'ghar', 'घर', 'होम', 'homescreen'];
const BACK_WORDS = ['back', 'wapas', 'वापस', 'pichhe', 'पीछे', 'peeche'];
const VIDEO_WORDS = ['video', 'videos', 'वीडियो', 'विडियो'];
const SEARCH_WORDS = ['search', 'google', 'dhundo', 'dhundho', 'dhoondo', 'dhoondh', 'dhunde', 'khojo', 'khoj', 'ढूंढो', 'ढूँढो', 'खोजो', 'खोज', 'सर्च'];
const STOP_WORDS = new Set([
  'open', 'kholo', 'khol', 'kholna', 'kholiye', 'launch', 'start', 'chalu', 'chalao', 'चालू',
  'खोलो', 'खोल', 'खोलना', 'खोलिए', 'शुरू', 'ओपन', 'चलाओ', 'चला',
  'app', 'application', 'please', 'pls', 'plz', 'karo', 'करो', 'kro', 'kar', 'कर', 'do', 'दो',
  'mujhe', 'मुझे', 'mere', 'मेरे', 'mera', 'मेरा', 'my', 'the', 'a', 'an', 'i', 'want', 'wanna',
  'par', 'पर', 'pe', 'on', 'to', 'me', 'में', 'ko', 'को', 'ka', 'का', 'ki', 'की', 'aur', 'और',
  'and', 'for', 'de', 'दे', 'dena', 'देना', 'yaar', 'यार', 'bhai', 'भाई', 'now', 'ab', 'अब',
]);
const has = (t, arr) => arr.some(w => t.includes(w));

function extractAppName(t) {
  const tokens = t.split(' ').filter(Boolean);
  const kept = tokens.filter(tok => !STOP_WORDS.has(tok));
  return kept.join(' ').trim();
}

/* Trailing verbs we strip off a search query: "doraemon search karo" -> "doraemon" */
const SEARCH_TAIL = /\b(search|dhundo|dhundho|dhoondo|dhoondh|dhunde|khojo|khoj|karo|kro|kr|kar|do|de|dikhao|dekho|dekh|dikha)\b/g;

/**
 * "<app> me/pe/par <query> search karo"  ->  search INSIDE that app.
 * This is what stops "YouTube me Doraemon search karo" from going to Google.
 */
function parseInAppSearch(t) {
  if (!has(t, SEARCH_WORDS)) return null;
  const m = t.match(/^(.*?)\s+(?:me|pe|par|में|पर|मे)\s+(.+)$/);
  if (!m) return null;
  const left = m[1].trim();
  if (!left) return null;
  const app = resolveApp(left);
  if (!app) return null;
  const q = m[2].replace(SEARCH_TAIL, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  return { intent: 'SEARCH_IN_APP', tool: 'search_in_app', args: { app: app.key, query: q } };
}

/**
 * Deterministic offline command parser (Hindi / Hinglish / English).
 * Returns { intent, tool, args } or null when nothing matches.
 */
function parseCommand(raw) {
  const t = normalize(raw);
  if (!t) return null;

  // 1) YouTube videos (own account)
  if ((t.includes('youtube') || t.includes('यूट्यूब') || t.includes(' yt ') || t.startsWith('yt ')) && has(t, VIDEO_WORDS)) {
    return { intent: 'LIST_YOUTUBE_VIDEOS', tool: 'list_youtube_videos', args: {} };
  }

  // 2) Back navigation
  if (has(t, BACK_WORDS) && !has(t, HOME_WORDS)) {
    return { intent: 'PRESS_BACK', tool: 'press_back', args: {} };
  }

  // 3) Home screen
  if (has(t, HOME_WORDS)) {
    return { intent: 'GO_HOME', tool: 'go_home', args: {} };
  }

  // 3b) Search INSIDE a specific app ("youtube me doraemon search karo")
  const inApp = parseInAppSearch(t);
  if (inApp) return inApp;

  // 4) Web search
  if (has(t, SEARCH_WORDS)) {
    const q = extractAppName(t.replace(/search|google|dhundo|ढूंढो|खोजो|सर्च/g, ' '));
    if (q) return { intent: 'SEARCH_WEB', tool: 'search_web', args: { query: q } };
  }

  // 5) Open an app (explicit verb or a bare known app name)
  const explicitOpen = has(t, OPEN_WORDS);
  const appName = explicitOpen ? extractAppName(t) : '';
  if (explicitOpen && appName) {
    const resolved = resolveApp(appName);
    return { intent: 'OPEN_APP', tool: 'open_app', args: { app_name: resolved ? resolved.key : appName } };
  }
  if (explicitOpen && !appName) return null;

  const bare = resolveApp(t);
  if (bare) return { intent: 'OPEN_APP', tool: 'open_app', args: { app_name: bare.key } };

  return null;
}

/* ----------------------------- Tool executor ----------------------------- */
const TOOL_LABELS = {
  open_app: 'Opening app…',
  go_home: 'Going home…',
  press_back: 'Going back…',
  list_youtube_videos: 'Checking YouTube…',
  search_web: 'Searching…',
  search_in_app: 'Searching in app…',
};

/* Per-app search URLs (web) and, where a real deep link exists, native Android intents. */
const enc = encodeURIComponent;
const APP_SEARCH = {
  youtube:       { web: q => 'https://www.youtube.com/results?search_query=' + enc(q),
                   native: q => 'intent://results?search_query=' + enc(q) + '#Intent;scheme=vnd.youtube;package=com.google.android.youtube;S.browser_fallback_url=' + enc('https://www.youtube.com/results?search_query=' + enc(q)) + ';end' },
  youtube_music: { web: q => 'https://music.youtube.com/search?q=' + enc(q) },
  instagram:     { web: q => 'https://www.instagram.com/explore/search/keyword/?q=' + enc(q) },
  spotify:       { web: q => 'https://open.spotify.com/search/' + enc(q),
                   native: q => 'intent://search/' + enc(q) + '#Intent;scheme=spotify;package=com.spotify.music;S.browser_fallback_url=' + enc('https://open.spotify.com/search/' + enc(q)) + ';end' },
  playstore:     { web: q => 'https://play.google.com/store/search?q=' + enc(q) + '&c=apps' },
  maps:          { web: q => 'https://www.google.com/maps/search/' + enc(q) },
  gmail:         { web: q => 'https://mail.google.com/mail/u/0/#search/' + enc(q) },
  drive:         { web: q => 'https://drive.google.com/drive/search?q=' + enc(q) },
  photos:        { web: q => 'https://photos.google.com/search/' + enc(q) },
  x:             { web: q => 'https://x.com/search?q=' + enc(q) },
  facebook:      { web: q => 'https://www.facebook.com/search/top?q=' + enc(q) },
  chrome:        { web: q => 'https://www.google.com/search?q=' + enc(q) },
};

function isAndroid() { return /Android/i.test(navigator.userAgent); }

function buildIntentUrl(entry) {
  const fallback = entry.web ? encodeURIComponent(entry.web) : encodeURIComponent('https://www.google.com');
  return 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;'
    + 'package=' + entry.pkg + ';S.browser_fallback_url=' + fallback + ';end';
}

function openExternal(url) {
  // Open in a new tab so the agent console itself stays alive.
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 800);
}

/**
 * Execute a tool call. Returns a promise resolving to
 * { success, tool, message?, error?, data? }
 */
async function executeTool(call) {
  const { tool, args = {} } = call;
  try {
    switch (tool) {
      case 'open_app': {
        const name = String(args.app_name || '').trim();
        if (!name) return fail(tool, 'INVALID_PARAMETERS', 'App का नाम नहीं मिला।');
        const entry = resolveApp(name);
        if (!entry) {
          return fail(tool, 'APPLICATION_NOT_FOUND',
            '“' + name + '” मेरी known app list में नहीं है। मैं web पर search कर सकता हूँ — बस कहो “' + name + ' search करो”.');
        }
        if (isAndroid()) {
          openExternal(buildIntentUrl(entry));
          return {
            success: true, tool,
            message: entry.label + ' open करने की request भेजी ✅ (अगर installed है तो खुलेगा, वरना web version)',
            data: { app_label: entry.label, package_name: entry.pkg, method: 'android-intent' },
          };
        }
        if (entry.web && settings.webFallback) {
          openExternal(entry.web);
          return {
            success: true, tool,
            message: entry.label + ' का web version खोल दिया ✅ (native app launch सिर्फ़ Android पर होता है)',
            data: { app_label: entry.label, method: 'web' },
          };
        }
        return fail(tool, 'NO_LAUNCH_METHOD',
          entry.label + ' इस device पर launch नहीं हो सकता (यह Android नहीं है और इसका web version उपलब्ध नहीं है)।');
      }

      case 'search_in_app': {
        const rawApp = String(args.app || '').trim();
        const q = String(args.query || '').trim();
        if (!q) return fail(tool, 'INVALID_PARAMETERS', 'Search query खाली है।');
        // The AI may send a display name ("YouTube"); resolve it to a registry key.
        const entry = resolveApp(rawApp);
        if (!entry) return fail(tool, 'APPLICATION_NOT_FOUND', '“' + rawApp + '” मेरी app list में नहीं है।');
        const s = APP_SEARCH[entry.key];
        if (!s) {
          const fb = 'https://www.google.com/search?q=' + enc(q);
          openExternal(fb);
          return { success: true, tool,
            message: entry.label + ' me direct search support नहीं है — Google पर “' + q + '” search खोल दिया ✅',
            data: { app: entry.label, query: q, url: fb, fallback: true } };
        }
        const url = (isAndroid() && s.native) ? s.native(q) : s.web(q);
        openExternal(url);
        return { success: true, tool,
          message: entry.label + ' par “' + q + '” search खोल दिया ✅',
          data: { app: entry.label, query: q, url: s.web(q) } };
      }

      case 'search_web': {
        const q = String(args.query || '').trim();
        if (!q) return fail(tool, 'INVALID_PARAMETERS', 'Search query खाली है।');
        const url = 'https://www.google.com/search?q=' + encodeURIComponent(q);
        openExternal(url);
        return { success: true, tool, message: 'Google पर “' + q + '” search खोल दिया ✅', data: { query: q, url } };
      }

      case 'press_back': {
        // Faithful web analogue of the agent-activity back dispatcher.
        if (history.length > 1) {
          history.back();
          return { success: true, tool, message: 'Back भेज दिया ✅ (app की अपनी history में)', data: { method: 'history.back' } };
        }
        return fail(tool, 'NO_HISTORY', 'Back जाने के लिए कोई previous screen नहीं है।');
      }

      case 'go_home': {
        return fail(tool, 'NOT_SUPPORTED_IN_WEB',
          'System Home button दबाना browser apps के लिए blocked है — यह web platform की limit है, कोई bug नहीं। '
          + 'फ़ोन के Home gesture/button से जाएँ, या किसी app का नाम बोलकर उसे खोलें।');
      }

      case 'list_youtube_videos': {
        return fail(tool, 'OAUTH_SETUP_REQUIRED',
          'आपके YouTube videos दिखाने के लिए Google OAuth setup चाहिए (कोई fake data नहीं भेजूँगा)। '
          + 'अभी यह configured नहीं है।');
      }

      default:
        return fail(tool, 'INVALID_TOOL', 'अनजान tool: ' + tool);
    }
  } catch (e) {
    return fail(tool, 'TOOL_EXECUTION_FAILED', e && e.message ? e.message : 'Tool fail हुआ।');
  }
}
function fail(tool, error, message) { return { success: false, tool, error, message }; }

/* ------------------------------- LLM brain ------------------------------- */
const SYSTEM_PROMPT =
  'You are the AI brain for a safe web-based Android agent console. '
  + 'Request at most one tool per turn and only use the declared tools. '
  + 'Never invent shell commands, root commands, hidden APIs, security bypasses or accessibility activation. '
  + 'To open an app use open_app with the user-facing app name. '
  + 'When the user wants to search INSIDE a specific app (e.g. "YouTube me Doraemon search karo", "search cricket on Instagram"), call search_in_app with that app name and the query — do NOT use search_web for that. '
  + 'Use search_web only for a general internet search that is not tied to an app. '
  + 'Answer concisely and naturally in the same language the user used (Hindi, Hinglish or English).';

const TOOL_DECLARATIONS = [
  {
    name: 'open_app',
    description: 'Open an installed Android app by its user-facing name (YouTube, Chrome, Instagram, Settings, Camera, Calculator…). The client resolves the installed app and launches it.',
    parameters: { type: 'object', properties: { app_name: { type: 'string', description: 'The app name the user wants to open.' } }, required: ['app_name'] },
  },
  {
    name: 'search_in_app',
    description: 'Search INSIDE a specific app (YouTube, Instagram, Spotify, Play Store, Maps, Gmail, Drive, Photos, X, Facebook, Chrome). Use this whenever the user names an app and a query to search for in it.',
    parameters: { type: 'object', properties: {
      app: { type: 'string', description: 'The app to search in, e.g. YouTube, Instagram, Spotify.' },
      query: { type: 'string', description: 'What to search for inside that app.' },
    }, required: ['app', 'query'] },
  },
  {
    name: 'search_web',
    description: 'Open a Google web search for a query. Use for anything that is not an app.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'The search query.' } }, required: ['query'] },
  },
  {
    name: 'go_home',
    description: 'Return to the device home screen. NOTE: not supported in the browser build.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'press_back',
    description: 'Go back one screen in the app history.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_youtube_videos',
    description: 'List the authenticated user\'s YouTube videos. Unavailable until OAuth is configured.',
    parameters: { type: 'object', properties: {} },
  },
];

function activeProvider() {
  return settings.provider !== 'none' && settings.apiKey ? settings.provider : null;
}
const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest';
const GEMINI_MODEL_SUGGESTIONS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-pro-preview'];

function defaultModel(provider) {
  if (settings.model) return settings.model;
  return provider === 'gemini' ? GEMINI_FALLBACK_MODEL : 'gpt-4o-mini';
}

/* --- Gemini --- */
function geminiBody(contents) {
  return {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    // NOTE: allowedFunctionNames is only accepted with mode 'ANY'. Sending it with
    // 'AUTO' is rejected by the current API (HTTP 400).
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };
}
async function geminiCall(model, contents) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(settings.apiKey);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody(contents)),
  });
}
async function geminiGenerate(contents) {
  let model = defaultModel('gemini');
  let r = await geminiCall(model, contents);
  // Retired model names return 404 — transparently retry on the rolling alias.
  if (r.status === 404 && model !== GEMINI_FALLBACK_MODEL) {
    const retry = await geminiCall(GEMINI_FALLBACK_MODEL, contents);
    if (retry.ok) { model = GEMINI_FALLBACK_MODEL; r = retry; }
  }
  if (!r.ok) throw new Error('HTTP_' + r.status + ': ' + (await r.text()).slice(0, 240));
  const j = await r.json();
  const content = j.candidates && j.candidates[0] && j.candidates[0].content;
  if (!content) throw new Error('GEMINI_MALFORMED_RESPONSE');
  return content;
}
function geminiRead(content) {
  const parts = content.parts || [];
  const fc = parts.find(p => p.functionCall);
  if (fc) return { kind: 'tool', name: fc.functionCall.name, args: fc.functionCall.args || {} };
  const text = parts.filter(p => p.text).map(p => p.text).join(' ').trim();
  if (!text) throw new Error('GEMINI_EMPTY_RESPONSE');
  return { kind: 'final', text };
}

/* --- OpenAI-compatible --- */
async function openaiGenerate(messages) {
  const base = (settings.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/+$/, '');
  const r = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
    body: JSON.stringify({
      model: defaultModel('openai'),
      messages,
      tools: TOOL_DECLARATIONS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: 'auto',
    }),
  });
  if (!r.ok) throw new Error('HTTP_' + r.status + ': ' + (await r.text()).slice(0, 240));
  const j = await r.json();
  const msg = j.choices && j.choices[0] && j.choices[0].message;
  if (!msg) throw new Error('OPENAI_MALFORMED_RESPONSE');
  return msg;
}
function openaiRead(msg) {
  if (msg.tool_calls && msg.tool_calls.length) {
    const tc = msg.tool_calls[0];
    let args = {};
    try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
    return { kind: 'tool', name: tc.function.name, args, raw: msg, toolCallId: tc.id };
  }
  const text = (msg.content || '').trim();
  if (!text) throw new Error('OPENAI_EMPTY_RESPONSE');
  return { kind: 'final', text };
}

/* -------------------------------- UI ------------------------------------ */
const el = (id) => document.getElementById(id);
const chat = el('chat');
const input = el('input');
const statusText = el('statusText');
const debugPanel = el('debugPanel');
const dbg = { intent: el('dbgIntent'), tool: el('dbgTool'), args: el('dbgArgs'), status: el('dbgStatus'), engine: el('dbgEngine') };
let busy = false;

function setStatus(text, kind) {
  statusText.textContent = text;
  statusText.className = 'status' + (kind ? ' ' + kind : '');
}
function setDebug(intent, tool, args, status, engine) {
  if (intent !== undefined) dbg.intent.textContent = intent || '—';
  if (tool !== undefined) dbg.tool.textContent = tool || '—';
  if (args !== undefined) dbg.args.textContent = args ? JSON.stringify(args) : '—';
  if (status !== undefined) dbg.status.textContent = status || '—';
  if (engine !== undefined) dbg.engine.textContent = engine || '—';
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function addMessage(role, text, isHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  if (role !== 'user') {
    const av = document.createElement('div');
    av.className = 'avatar';
    av.innerHTML = role === 'tool' ? '&#9881;' : '&#10022;';
    wrap.appendChild(av);
  }
  const b = document.createElement('div');
  b.className = 'bubble';
  if (isHtml) b.innerHTML = text; else b.textContent = text;
  wrap.appendChild(b);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
  return b;
}
function addTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'msg assistant';
  wrap.innerHTML = '<div class="avatar">&#10022;</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>';
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
  return wrap;
}
let toastTimer;
function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function greeting() {
  const p = activeProvider();
  return '<strong>Namaste, Raju.</strong> मैं आपका AI Agent हूँ।\n'
    + 'अभी mode: <span class="' + (p ? 'ok' : 'warn') + '">' + (p ? p.toUpperCase() + ' (AI on)' : 'Offline commands') + '</span>.\n'
    + 'Try: <em>YouTube me Doraemon search karo</em>, <em>Instagram pe cricket search karo</em>, ya <em>Camera kholo</em>.';
}

/* ------------------------------ Agent flow ------------------------------- */
function updateModeBanner() {
  const p = activeProvider();
  const banner = el('modeBanner');
  if (p) { banner.hidden = true; return; }
  banner.hidden = false;
  el('modeBannerText').textContent = settings.provider === 'none'
    ? 'Offline mode — app commands चलेंगे। Free-form AI chat के लिए Settings में API key डालें।'
    : 'AI engine चुना है पर API key missing है — Settings में key डालें।';
}

async function runAgent(text) {
  if (busy) return;
  const msg = text.trim();
  if (!msg) return;
  busy = true;
  addMessage('user', msg);
  setStatus('Understanding…', 'busy');

  try {
    // Deterministic parser first: fast, offline, reliable for known commands.
    const local = parseCommand(msg);
    if (local) {
      await runToolFlow(local, 'parser');
      return;
    }
    // Free-form -> AI engine if configured.
    if (activeProvider()) {
      await runLlmFlow(msg);
    } else {
      addMessage('assistant',
        'यह command मैं offline mode में समझ नहीं पाया। मैं ये कर सकता हूँ: किसी app को खोलना (YouTube, Chrome, Camera…), '
        + 'web search, back navigation, और YouTube-videos check.\n'
        + 'Free-form सवालों के लिए Settings → AI engine में अपनी API key डालें।');
      setStatus('Idle');
    }
  } catch (e) {
    addMessage('assistant', '<span class="bad">Error:</span> ' + esc(readableError(e)), true);
    setStatus('Error', 'err');
  } finally {
    busy = false;
  }
}

async function runToolFlow(call, engine) {
  setStatus(TOOL_LABELS[call.tool] || 'Running tool…', 'busy');
  setDebug(call.intent, call.tool, call.args, 'REQUESTED', engine);
  if (settings.debug) addMessage('tool', '→ ' + call.tool + ' ' + JSON.stringify(call.args));

  const result = await executeTool(call);
  setDebug(call.intent, call.tool, call.args, result.success ? 'SUCCESS' : 'FAILED', engine);

  if (result.success) {
    addMessage('assistant', '<span class="ok">✔</span> ' + esc(result.message || 'Done'), true);
    setStatus('Done', 'ok');
  } else {
    addMessage('assistant', '<span class="warn">⚠</span> ' + esc(result.message || result.error), true);
    setStatus('Handled', 'err');
  }
}

async function runLlmFlow(userText) {
  const provider = activeProvider();
  setDebug('AI_TURN', '—', null, 'THINKING', provider);

  if (provider === 'gemini') {
    const history = [{ role: 'user', parts: [{ text: userText }] }];
    for (let step = 0; step < 5; step++) {
      const content = await geminiGenerate(history);
      history.push(content);
      const out = geminiRead(content);
      if (out.kind === 'final') { addMessage('assistant', out.text); setStatus('Done', 'ok'); setDebug('AI_TURN', '—', null, 'SUCCESS', provider); return; }
      const call = { intent: out.name.toUpperCase(), tool: out.name, args: out.args };
      setDebug(call.intent, call.tool, call.args, 'REQUESTED', provider);
      if (settings.debug) addMessage('tool', '→ ' + call.tool + ' ' + JSON.stringify(call.args));
      const result = await executeTool(call);
      setDebug(call.intent, call.tool, call.args, result.success ? 'SUCCESS' : 'FAILED', provider);
      history.push({ role: 'user', parts: [{ functionResponse: { name: call.tool, response: { success: result.success, message: result.message || '', error: result.error || '', data: result.data || {} } } }] });
      if (settings.debug && result.message) addMessage('tool', '← ' + result.message);
    }
    throw new Error('MAX_TOOL_CALLS_EXCEEDED');
  }

  // OpenAI-compatible
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userText }];
  for (let step = 0; step < 5; step++) {
    const msg = await openaiGenerate(messages);
    messages.push(msg);
    const out = openaiRead(msg);
    if (out.kind === 'final') { addMessage('assistant', out.text); setStatus('Done', 'ok'); setDebug('AI_TURN', '—', null, 'SUCCESS', provider); return; }
    const call = { intent: out.name.toUpperCase(), tool: out.name, args: out.args };
    setDebug(call.intent, call.tool, call.args, 'REQUESTED', provider);
    if (settings.debug) addMessage('tool', '→ ' + call.tool + ' ' + JSON.stringify(call.args));
    const result = await executeTool(call);
    setDebug(call.intent, call.tool, call.args, result.success ? 'SUCCESS' : 'FAILED', provider);
    messages.push({ role: 'tool', tool_call_id: out.toolCallId, content: JSON.stringify({ success: result.success, message: result.message || '', error: result.error || '' }) });
    if (settings.debug && result.message) addMessage('tool', '← ' + result.message);
  }
  throw new Error('MAX_TOOL_CALLS_EXCEEDED');
}

function readableError(e) {
  const raw = (e && e.message) ? e.message : String(e);
  if (/HTTP_401|HTTP_403/.test(raw)) return 'API key ग़लत या unauthorized है। Settings में key जाँचें।';
  if (/HTTP_429/.test(raw)) return 'API rate limit हो गया — थोड़ी देर बाद try करें।';
  if (/HTTP_404/.test(raw)) return 'यह AI model अब available नहीं है (retire हो गया)। Settings → Model में gemini-flash-latest रखें।';
  if (/HTTP_400/.test(raw)) return 'AI request reject हुई (format/model ग़लत)। Settings में model की जाँच करें।';
  if (/HTTP_5\d\d/.test(raw)) return 'AI server व्यस्त है (temporary)। थोड़ी देर बाद try करें।';
  if (/HTTP_/.test(raw)) return 'AI provider error: ' + raw;
  if (/Failed to fetch|NetworkError|load failed/i.test(raw)) return 'Network/AI provider से connection नहीं हुआ। Internet जाँचें (या API endpoint block है)।';
  if (/MAX_TOOL_CALLS/.test(raw)) return 'मैं इस task को सुरक्षित रूप से पूरा नहीं कर पाया (tool limit)।';
  if (/EMPTY_RESPONSE|MALFORMED/.test(raw)) return 'AI ने खाली/अनजान response दिया। दोबारा try करें।';
  return raw;
}

/* ------------------------------ Voice input ------------------------------ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let listening = false;

function initSpeech() {
  const micBtn = el('micBtn');
  if (!SR) { micBtn.hidden = true; return; }
  recognizer = new SR();
  recognizer.lang = 'hi-IN';
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  recognizer.onresult = (e) => {
    const t = e.results[0][0].transcript;
    input.value = t;
    toast('सुना: ' + t);
  };
  recognizer.onerror = (e) => { toast('Voice error: ' + e.error); };
  recognizer.onend = () => { listening = false; micBtn.classList.remove('rec'); };

  micBtn.addEventListener('click', () => {
    if (listening) { recognizer.stop(); return; }
    try { recognizer.start(); listening = true; micBtn.classList.add('rec'); toast('बोलिए…'); }
    catch { toast('Voice शुरू नहीं हो सका'); }
  });
}

/* -------------------------------- Wiring -------------------------------- */
el('composerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value;
  input.value = '';
  runAgent(v);
});

// Settings sheet
function openSheet() {
  el('provider').value = settings.provider;
  el('apiKey').value = settings.apiKey;
  el('model').value = settings.model;
  el('baseUrl').value = settings.baseUrl;
  el('debugSwitch').checked = !!settings.debug;
  el('webFallback').checked = !!settings.webFallback;
  syncSheet();
  el('sheetOverlay').hidden = false;
}
function closeSheet() { el('sheetOverlay').hidden = true; }
function syncSheet() {
  const p = el('provider').value;
  el('aiFields').hidden = p === 'none';
  el('baseUrlField').hidden = p !== 'openai';
  const model = el('model');
  if (p === 'gemini') {
    model.placeholder = 'e.g. gemini-flash-latest';
    model.setAttribute('list', 'geminiModels');
    el('modelHint').textContent = 'Suggested: gemini-flash-latest (rolling alias — hamesha chalta rahega).';
  } else if (p === 'openai') {
    model.placeholder = 'e.g. gpt-4o-mini';
    model.setAttribute('list', 'openaiModels');
    el('modelHint').textContent = 'Koi bhi OpenAI-compatible model, e.g. gpt-4o-mini.';
  } else {
    model.placeholder = '';
    model.removeAttribute('list');
    el('modelHint').textContent = '';
  }
}
el('settingsBtn').addEventListener('click', openSheet);
el('sheetClose').addEventListener('click', closeSheet);
el('sheetOverlay').addEventListener('click', (e) => { if (e.target === el('sheetOverlay')) closeSheet(); });
el('provider').addEventListener('change', syncSheet);
el('modeBannerBtn').addEventListener('click', openSheet);

el('saveSettings').addEventListener('click', () => {
  settings.provider = el('provider').value;
  settings.apiKey = el('apiKey').value.trim();
  settings.model = el('model').value.trim();
  settings.baseUrl = el('baseUrl').value.trim() || DEFAULT_SETTINGS.baseUrl;
  settings.debug = el('debugSwitch').checked;
  settings.webFallback = el('webFallback').checked;
  saveSettings();
  applyDebugVisibility();
  updateModeBanner();
  closeSheet();
  addMessage('assistant', 'Settings save हो गईं ✅ अब mode: <strong>' + (activeProvider() ? activeProvider().toUpperCase() + ' (AI on)' : 'Offline commands') + '</strong>.', true);
  setStatus('Idle');
  toast('Saved');
});

el('clearChat').addEventListener('click', () => {
  chat.innerHTML = '';
  addMessage('assistant', greeting(), true);
  closeSheet();
  toast('Chat cleared');
});

el('debugToggle').addEventListener('click', () => {
  settings.debug = false; saveSettings(); applyDebugVisibility();
});
function applyDebugVisibility() { debugPanel.hidden = !settings.debug; }

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!el('sheetOverlay').hidden) closeSheet();
  if (!el('installHelp').hidden) closeInstallHelp();
});

/* ------------------------------ PWA install ------------------------------ */
const INSTALL_DISMISS_KEY = 'aiagent.installDismissed.v1';
let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || window.navigator.standalone === true;
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function installDismissed() {
  try { return localStorage.getItem(INSTALL_DISMISS_KEY) === '1'; } catch { return false; }
}
const HELP_SEEN_KEY = 'aiagent.installHelpSeen.v1';
function helpSeen() { try { return localStorage.getItem(HELP_SEEN_KEY) === '1'; } catch { return true; } }
function markHelpSeen() { try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch {} }
function platformSteps() {
  if (isIOS()) return {
    title: 'iPhone / iPad',
    steps: [
      'Ye page <strong>Safari</strong> me kholo (iOS pe Chrome install support nahi karta).',
      'Neeche <strong>Share</strong> button (□↑) dabao.',
      '<strong>Add to Home Screen</strong> chuno, phir <strong>Add</strong> dabao.',
    ],
  };
  if (/Android/i.test(navigator.userAgent)) return {
    title: 'Android',
    steps: [
      'Ye page <strong>Chrome</strong> me kholo.',
      'Upar right corner me <strong>⋮</strong> (menu) dabao.',
      '<strong>Install app</strong> ya <strong>Add to Home screen</strong> chuno.',
      'Confirm karo — icon home screen pe aa jaayega, full screen khulega.',
    ],
  };
  return {
    title: 'Desktop (Chrome / Edge)',
    steps: [
      'Ye page Chrome ya Edge me kholo.',
      'Address bar ke right me <strong>install</strong> (⤓ ya monitor) icon dabao.',
      'Ya browser menu → <strong>Install AI Agent</strong> chuno.',
    ],
  };
}
function openInstallHelp() {
  const p = platformSteps();
  el('installHelpBody').innerHTML =
    '<div class="note">Tumhare device ke liye: <strong>' + esc(p.title) + '</strong></div>'
    + '<ol>' + p.steps.map(s => '<li>' + s + '</li>').join('') + '</ol>'
    + '<div class="note">Install button na dikhe? Page ko thoda scroll/use karo ya reload karo — '
    + 'Chrome ko install prompt dikhane se pehle thodi engagement chahiye. Menu wala tareeka har haal me chalta hai.</div>';
  el('installHelp').hidden = false;
}
function closeInstallHelp() { el('installHelp').hidden = true; }

function showInstallUI() {
  if (isStandalone()) {
    el('installBtn').hidden = true;
    el('installBanner').hidden = true;
    return;
  }
  el('installBtn').hidden = false;
  el('installBanner').hidden = installDismissed();
}

async function doInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') {
      el('installBanner').hidden = true;
      el('installBtn').hidden = true;
      toast('Install ho gaya 🎉');
    } else {
      toast('Install cancel kiya');
    }
    return;
  }
  openInstallHelp();
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallUI();
});
window.addEventListener('appinstalled', () => {
  el('installBtn').hidden = true;
  el('installBanner').hidden = true;
  toast('App install ho gaya 🎉');
});
el('installBtn').addEventListener('click', doInstall);
el('installBannerBtn').addEventListener('click', doInstall);
el('installDismiss').addEventListener('click', () => {
  el('installBanner').hidden = true;
  try { localStorage.setItem(INSTALL_DISMISS_KEY, '1'); } catch {}
});
el('installHelpClose').addEventListener('click', closeInstallHelp);
el('installHelp').addEventListener('click', (e) => { if (e.target === el('installHelp')) closeInstallHelp(); });

/* -------------------------------- Boot ---------------------------------- */
function boot() {
  // One-time: move existing installs to the clean chat view (no raw tool-trace lines).
  try {
    if (localStorage.getItem('aiagent.traceOff.v1') !== '1') {
      localStorage.setItem('aiagent.traceOff.v1', '1');
      if (settings.debug) { settings.debug = false; saveSettings(); }
    }
  } catch {}
  applyDebugVisibility();
  updateModeBanner();
  addMessage('assistant', greeting(), true);
  setStatus('Idle');
  setDebug('—', '—', null, 'Idle', activeProvider() || 'parser');
  initSpeech();
  showInstallUI();
  // First visit on an uninstalled device: show the install steps straight away.
  if (!isStandalone() && !helpSeen()) {
    markHelpSeen();
    setTimeout(openInstallHelp, 900);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
  // App-shortcut deep links: ?cmd=YouTube%20खोलो
  try {
    const cmd = new URLSearchParams(location.search).get('cmd');
    if (cmd) {
      history.replaceState(null, '', location.pathname);
      setTimeout(() => runAgent(cmd), 400);
    }
  } catch {}
}
boot();
