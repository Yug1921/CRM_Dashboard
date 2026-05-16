// GoTeeOff Lead Capture — content.js v1.4
// IMPORTANT: This must be the ONLY content in this file.
// If you see "LOG already declared", the file has duplicate content — delete all and repaste.
(function() {
'use strict';

const LOG = (msg, data) => console.log(`[GoTeeOff]`, msg, data !== undefined ? data : '');
LOG('v1.4 loaded:', window.location.href);

// ── Enabled check ──
function isEnabled() {
  return new Promise(r => chrome.storage.local.get({ enabled: true }, d => r(d.enabled)));
}

// ── SPA nav polling ──
let _lastHref = location.href;
setInterval(async () => {
  if (location.href !== _lastHref) {
    _lastHref = location.href;
    if (await isEnabled()) setTimeout(() => detectAndCapture(location.href), 1800);
  }
}, 800);

setTimeout(async () => { if (await isEnabled()) detectAndCapture(location.href); }, 2500);

chrome.storage.onChanged.addListener(c => { if (c.enabled) LOG(c.enabled.newValue ? 'ENABLED' : 'DISABLED'); });

function detectAndCapture(url) {
  if (/linkedin\.com\/in\/[^/?]+/.test(url))        { captureProfilePage(url); return; }
  if (/linkedin\.com\/company\/[^/?]+/.test(url))   { captureCompanyPage(url); return; }
  if (/linkedin\.com\/search\/results\//.test(url)) { setTimeout(() => captureSearchResults(url), 2000); }
}

function getText(el) { return el ? (el.innerText || el.textContent || '').trim().replace(/\s+/g,' ') : ''; }
function norm(raw) {
  try { const u = new URL(raw); return (u.origin + u.pathname).toLowerCase().replace(/\/$/,''); }
  catch(_) { return raw.toLowerCase().split('?')[0].replace(/\/$/,''); }
}
const JUNK = /^(1st|2nd|3rd|3rd\+|2nd\+|follow|connect|message|mutual|\d+|see all|•|·)$/i;
function isJunk(t) { return !t || t.length < 3 || t.length > 150 || JUNK.test(t.trim()); }

// ── Search results ──
function captureSearchResults(url) {
  LOG('Scanning...');
  let cards = Array.from(document.querySelectorAll('li[data-entity-urn]'));
  if (!cards.length) cards = Array.from(document.querySelectorAll('li[class*="entity-item"]'));
  if (!cards.length) {
    cards = Array.from(document.querySelectorAll('li')).filter(li => li.querySelector('a[href*="/in/"],a[href*="/company/"]'));
  }
  LOG(`Cards: ${cards.length}`);
  if (!cards.length) { setTimeout(() => captureSearchResults(url), 2000); return; }

  let captured = 0;
  const seen = new Set();

  cards.forEach((card, idx) => {
    const linkEl = card.querySelector('a[href*="/in/"],a[href*="/company/"]');
    if (!linkEl) return;
    let profileUrl = linkEl.href || '';
    if (profileUrl.startsWith('/')) profileUrl = 'https://www.linkedin.com' + profileUrl;
    profileUrl = norm(profileUrl);
    if (!/linkedin\.com\/(in|company)\/[^/?]+/.test(profileUrl)) return;
    if (seen.has(profileUrl)) return;
    seen.add(profileUrl);

    let name = '';
    for (const sp of Array.from(linkEl.querySelectorAll('span'))) {
      const t = getText(sp);
      if (!isJunk(t) && sp.children.length === 0) { name = t; break; }
    }
    if (!name) { const al = linkEl.getAttribute('aria-label') || ''; if (!isJunk(al)) name = al; }
    if (!name) name = getText(card.querySelector('h3,h4')) || '';
    if (isJunk(name)) name = '';

    let headline = '', location = '';
    const els = Array.from(card.querySelectorAll('span,div,p'));
    for (const el of els) {
      if (linkEl.contains(el) || el.children.length > 0) continue;
      const t = getText(el);
      if (isJunk(t) || t === name) continue;
      if (!headline) { headline = t; continue; }
      if (!location) { location = t; break; }
    }

    LOG(`Card ${idx+1}: "${name}" | "${headline}" | "${location}"`);
    if (!name && !headline) return;

    sendToBackground({
      profile_url: profileUrl,
      profile_type: profileUrl.includes('/company/') ? 'company' : 'person',
      full_name: name || 'LinkedIn Member',
      headline, location,
      about: '', company: '', connections: '',
      source: 'linkedin_search'
    });
    captured++;
  });
  LOG(`✓ Sent ${captured}/${cards.length}`);
}

// ── Profile page ──
function captureProfilePage(url) {
  function tryGet(sels, ctx=document) {
    for (const s of sels) { try { const t=getText(ctx.querySelector(s)); if(t) return t; } catch(_){} } return '';
  }
  const data = {
    profile_url: norm(url), profile_type: 'person',
    full_name:   tryGet(['h1.text-heading-xlarge','h1[class*="heading"]','main h1','h1']),
    headline:    tryGet(['.text-body-medium.break-words','[class*="text-body-medium"]']),
    location:    tryGet(['.text-body-small.inline.t-black--light.break-words','[class*="t-black--light"]']),
    about:       tryGet(['#about ~ * span[aria-hidden="true"]','.pv-shared-text-with-see-more span']),
    company:     tryGet(['button[aria-label*="Current company"] span[aria-hidden="true"]']),
    connections: '', source: 'linkedin_browse'
  };
  LOG('Profile:', data.full_name);
  if (!data.full_name) { setTimeout(() => captureProfilePage(url), 2000); return; }
  sendToBackground(data);
}

// ── Company page ──
function captureCompanyPage(url) {
  function tryGet(sels, ctx=document) {
    for (const s of sels) { try { const t=getText(ctx.querySelector(s)); if(t) return t; } catch(_){} } return '';
  }
  const data = {
    profile_url: norm(url), profile_type: 'company',
    full_name: tryGet(['h1.org-top-card-summary__title','.org-top-card h1','main h1','h1']),
    headline:  tryGet(['.org-top-card-summary__tagline','.org-top-card-summary__industry']),
    location:  tryGet(['.org-top-card-summary-info-list__info-item']),
    about:     tryGet(['.org-about-us-organization-description__text span']),
    company: '', connections: '', source: 'linkedin_browse'
  };
  LOG('Company:', data.full_name);
  if (!data.full_name) { setTimeout(() => captureCompanyPage(url), 2000); return; }
  sendToBackground(data);
}

// ── Send — always checks enabled ──
function sendToBackground(data) {
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    if (!enabled) { LOG('Blocked — OFF'); return; }
    chrome.runtime.sendMessage({ type: 'PROFILE_SCRAPED', data }, res => {
      if (chrome.runtime.lastError) return;
      LOG('ACK:', res ? res.status : 'none');
    });
  });
}

})(); // end IIFE — prevents variable collision with other extensions