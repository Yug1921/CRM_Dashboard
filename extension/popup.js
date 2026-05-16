// GoTeeOff Lead Capture — popup.js v1.4
const $ = id => document.getElementById(id);

// ── Session counter (resets each time popup opens) ──
let sessionNew = 0, sessionDup = 0;

// ── Activity log (stored in memory + chrome.storage) ──
const MAX_FEED = 50;

const STATUS_CFG = {
  success:      { cls:'success',   dot:false, label:'✓ Captured' },
  duplicate:    { cls:'duplicate', dot:false, label:'↩ Duplicate' },
  offline:      { cls:'offline',   dot:true,  label:'Queued offline' },
  rate_limited: { cls:'error',     dot:false, label:'Daily limit hit' },
  idle:         { cls:'idle',      dot:false, label:'Waiting…' },
  disabled:     { cls:'idle',      dot:false, label:'Extension OFF' },
};

function setStatus(status, name='') {
  const cfg = STATUS_CFG[status] || STATUS_CFG.idle;
  const pill = $('status-pill');
  pill.className = `pill ${cfg.cls}`;
  const dot = $('status-dot');
  dot.className = cfg.dot ? 'dot pulse' : 'dot';
  $('status-txt').textContent = name ? `${cfg.label}: ${truncate(name,22)}` : cfg.label;
}

function setCount(n, dupCount=null, oqSize=null) {
  $('count').textContent = n;
  const pct = Math.min(Math.round((n/80)*100), 100);
  $('prog-pct').textContent = pct + '%';
  const fill = $('prog-fill');
  fill.style.width = pct + '%';
  fill.className = pct >= 90 ? 'prog-fill danger' : pct >= 70 ? 'prog-fill warn' : 'prog-fill';
  if (dupCount !== null) $('dup-count').textContent = dupCount;
  if (oqSize !== null)   $('oq-count').textContent  = oqSize;
}

function syncToggle(on) {
  $('tlabel').textContent  = on ? 'ON' : 'OFF';
  $('tlabel').className    = on ? 'tlabel on' : 'tlabel';
  if (!on) setStatus('disabled');
}

function truncate(s, n) { return s && s.length > n ? s.slice(0,n)+'…' : s; }

function timeAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

// ── Feed management ──
function addFeedItem(item) {
  // Save to storage
  chrome.storage.local.get({ activity_log: [] }, ({ activity_log }) => {
    activity_log.unshift(item);
    if (activity_log.length > MAX_FEED) activity_log.pop();
    chrome.storage.local.set({ activity_log });
  });
  renderFeedItem(item, true);
}

function renderFeedItem(item, prepend=false) {
  $('feed-empty').style.display = 'none';
  const el = document.createElement('div');
  el.className = 'feed-item';
  el.innerHTML = `
    <div class="fi-dot ${item.status}"></div>
    <div class="fi-body">
      <div class="fi-name">${item.name || 'LinkedIn Member'}</div>
      <div class="fi-meta">${item.headline || item.category || ''}</div>
    </div>
    <div class="fi-time">${timeAgo(item.ts)}</div>
  `;
  if (prepend && $('feed').firstChild) {
    $('feed').insertBefore(el, $('feed').firstChild);
  } else {
    $('feed').appendChild(el);
  }
  // Keep max items in DOM
  const items = $('feed').querySelectorAll('.feed-item');
  if (items.length > MAX_FEED) items[items.length-1].remove();
}

function renderFeed(log) {
  $('feed').querySelectorAll('.feed-item').forEach(e => e.remove());
  if (!log.length) { $('feed-empty').style.display = 'block'; return; }
  $('feed-empty').style.display = 'none';
  log.forEach(item => renderFeedItem(item, false));
}

function updateFeedBadge(n) {
  $('feed-badge').textContent = n > 99 ? '99+' : n;
}

// ── Load all state on open ──
function load() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, stats => {
    if (chrome.runtime.lastError || !stats) return;
    $('tog').checked = stats.enabled;
    syncToggle(stats.enabled);
    setCount(stats.daily_scrape_count, stats.dup_count || 0, stats.offline_queue_size);
    $('session-count').textContent = sessionNew;
    $('cat').value   = stats.selected_category || 'crypto_influencer';
    $('api').value   = stats.api_base || 'http://127.0.0.1:8000';
    setStatus(stats.last_capture_status || 'idle', stats.last_capture_name);
    if (stats.offline_queue_size > 0) {
      $('oq-badge').textContent = `▲ ${stats.offline_queue_size} queued`;
      $('oq-badge').classList.add('show');
    }
  });

  // Load activity log
  chrome.storage.local.get({ activity_log: [], dup_count: 0 }, ({ activity_log, dup_count }) => {
    renderFeed(activity_log);
    updateFeedBadge(activity_log.length);
    $('dup-count').textContent = dup_count;
  });
}

// ── Tabs ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
    // Reset badge when opening feed
    if (tab.dataset.tab === 'feed') updateFeedBadge($('feed').querySelectorAll('.feed-item').length);
  });
});

// ── Toggle ──
$('tog').addEventListener('change', e => {
  const on = e.target.checked;
  chrome.storage.local.set({ enabled: on });
  syncToggle(on);
});

// ── Category ──
$('cat').addEventListener('change', e => chrome.storage.local.set({ selected_category: e.target.value }));

// ── Save API ──
$('save').addEventListener('click', () => {
  const v = $('api').value.trim().replace(/\/$/,'');
  if (!v) return;
  chrome.storage.local.set({ api_base: v });
  $('save').textContent = '✓';
  setTimeout(() => ($('save').textContent = 'Save'), 1400);
});

// ── Test ──
$('test').addEventListener('click', () => {
  const base = $('api').value.trim().replace(/\/$/,'');
  $('test').textContent = 'Testing…'; $('test').className = 'btn btn-test';
  chrome.runtime.sendMessage({ type: 'TEST_CONNECTION', apiBase: base }, res => {
    if (res && res.ok) { $('test').textContent = '✓ Connected'; $('test').classList.add('ok'); }
    else               { $('test').textContent = '✗ Not reachable'; $('test').classList.add('fail'); }
    setTimeout(() => { $('test').textContent = 'Test connection'; $('test').className = 'btn btn-test'; }, 2500);
  });
});

// ── Clear feed ──
$('clear-feed').addEventListener('click', () => {
  chrome.storage.local.set({ activity_log: [] });
  $('feed').querySelectorAll('.feed-item').forEach(e => e.remove());
  $('feed-empty').style.display = 'block';
  updateFeedBadge(0);
});

// ── Refresh times every 30s so "2s ago" doesn't go stale ──
setInterval(() => {
  $('feed').querySelectorAll('.fi-time').forEach((el, i) => {
    chrome.storage.local.get({ activity_log: [] }, ({ activity_log }) => {
      if (activity_log[i]) el.textContent = timeAgo(activity_log[i].ts);
    });
  });
}, 30000);

// ── Live updates from background ──
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'CAPTURED') {
    const isDup = msg.status === 'duplicate';
    if (!isDup) sessionNew++;
    else sessionDup++;

    $('session-count').textContent = sessionNew;
    setCount(msg.count);
    setStatus(msg.status || 'success', msg.name);

    // Update dup counter in storage
    if (isDup) {
      chrome.storage.local.get({ dup_count: 0 }, ({ dup_count }) => {
        const n = dup_count + 1;
        chrome.storage.local.set({ dup_count: n });
        $('dup-count').textContent = n;
      });
    }

    // Add to feed
    const item = {
      name:     msg.name || 'LinkedIn Member',
      headline: msg.headline || '',
      category: msg.category || '',
      status:   msg.status || 'success',
      ts:       Date.now()
    };
    addFeedItem(item);

    // Update badge (only if not on feed tab)
    const feedTab = document.querySelector('[data-tab="feed"]');
    if (!feedTab.classList.contains('active')) {
      const current = parseInt($('feed-badge').textContent) || 0;
      updateFeedBadge(current + 1);
    }

    // Footer hint
    $('ft-hint').textContent = isDup ? `↩ Already in CRM` : `✓ ${truncate(msg.name||'Lead',20)} saved`;
    setTimeout(() => ($('ft-hint').textContent = 'Browse LinkedIn → leads auto-captured'), 3000);
  }

  if (msg.type === 'RATE_LIMITED') {
    setStatus('rate_limited');
    $('ft-hint').textContent = '⚠ Daily limit reached (80/day)';
  }
});

load();