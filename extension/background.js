// ============================================================
// GoTeeOff Lead Capture — background.js (v1.3 — production)
// ============================================================

const LOG = (msg, data) => console.log(`[GoTeeOff BG]`, msg, data !== undefined ? data : '');

const DAILY_LIMIT = 80;
const DEFAULT_API_BASE = 'http://127.0.0.1:8000';
const ENDPOINT = '/api/ingest/linkedin-profile-full';

// ── Midnight reset alarm ──
chrome.alarms.create('midnight-reset', {
  when: nextMidnight(),
  periodInMinutes: 1440
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'midnight-reset') {
    chrome.storage.local.set({ daily_scrape_count: 0, last_capture_status: 'idle' });
    LOG('Daily counter reset');
  }
});

function nextMidnight() {
  const m = new Date(); m.setHours(24, 0, 0, 0); return m.getTime();
}

// ── Message router ──
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'PROFILE_SCRAPED') { handleCapture(msg.data).then(reply); return true; }
  if (msg.type === 'GET_STATS')       { getStats().then(reply); return true; }
  if (msg.type === 'TEST_CONNECTION') { testConn(msg.apiBase).then(reply); return true; }
});

// ── Core capture handler ──
async function handleCapture(data) {
  const store = await get({
    enabled: true,
    daily_scrape_count: 0,
    selected_category: 'crypto_influencer',
    api_base: DEFAULT_API_BASE
  });

  if (!store.enabled) return { status: 'disabled' };

  if (store.daily_scrape_count >= DAILY_LIMIT) {
    notifyPopup({ type: 'RATE_LIMITED' });
    return { status: 'rate_limited' };
  }

  const payload = {
    profile_url:  data.profile_url,
    full_name:    data.full_name   || '',
    headline:     data.headline    || '',
    location:     data.location    || '',
    company:      data.company     || '',
    about:        data.about       || '',
    connections:  data.connections || '',
    profile_type: data.profile_type || 'person',
    category_hint: store.selected_category,
    source:       data.source || 'chrome_extension',
    raw_data:     data
  };

  const result = await postWithRetry(store.api_base, payload);
  const newCount = store.daily_scrape_count + 1;

  if (result.ok) {
    await set({
      daily_scrape_count: newCount,
      last_capture_status: result.duplicate ? 'duplicate' : 'success',
      last_capture_time: Date.now(),
      last_capture_name: data.full_name || 'Unknown'
    });
    if (!result.duplicate) {
      LOG(`✓ Saved (${newCount}/${DAILY_LIMIT}): ${data.full_name}`);
      notifyPopup({ type: "CAPTURED", count: newCount, name: data.full_name, headline: data.headline||"", category: store.selected_category, status: "success" });
    } else {
      LOG(`↩ Duplicate skipped: ${data.full_name}`);
      notifyPopup({ type: "CAPTURED", count: store.daily_scrape_count, name: data.full_name, headline: data.headline||"", category: store.selected_category, status: "duplicate" });
    }
    return { status: result.duplicate ? 'duplicate' : 'ok', count: newCount };
  } else {
    await queueOffline(payload);
    await set({ last_capture_status: 'offline' });
    return { status: 'queued_offline' };
  }
}

// ── POST with one retry ──
async function postWithRetry(apiBase, payload, attempt = 1) {
  try {
    const res = await fetch(`${apiBase}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    return { ok: true, duplicate: body.status === 'duplicate' };
  } catch (err) {
    if (attempt === 1) {
      await sleep(3000);
      return postWithRetry(apiBase, payload, 2);
    }
    LOG('POST failed after retry:', err.message);
    return { ok: false };
  }
}

// ── Offline queue with auto-flush every 30s ──
async function queueOffline(payload) {
  const { offline_queue } = await get({ offline_queue: [] });
  offline_queue.push({ payload, queued_at: Date.now() });
  await set({ offline_queue });
  LOG(`Queued offline. Total: ${offline_queue.length}`);
}

setInterval(async () => {
  const store = await get({ offline_queue: [], api_base: DEFAULT_API_BASE, enabled: true });
  if (!store.enabled || !store.offline_queue.length) return;
  const remaining = [];
  for (const item of store.offline_queue) {
    const r = await postWithRetry(store.api_base, item.payload);
    if (!r.ok) remaining.push(item);
  }
  if (remaining.length !== store.offline_queue.length) {
    await set({ offline_queue: remaining });
    LOG(`Flushed offline queue. Remaining: ${remaining.length}`);
  }
}, 30000);

// ── Stats ──
async function getStats() {
  return get({
    daily_scrape_count: 0,
    enabled: true,
    selected_category: 'crypto_influencer',
    api_base: DEFAULT_API_BASE,
    last_capture_status: 'idle',
    last_capture_time: null,
    last_capture_name: '',
    offline_queue: []
  }).then(d => ({ ...d, limit: DAILY_LIMIT, offline_queue_size: d.offline_queue.length }));
}

// ── Connection test ──
async function testConn(apiBase) {
  try {
    const r = await fetch(`${apiBase}/health`);
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── Notify popup if open ──
function notifyPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// ── Storage helpers ──
function get(defaults) {
  return new Promise(resolve => chrome.storage.local.get(defaults, resolve));
}
function set(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }