/* HexBlock — dashboard.js */
'use strict';

// ── State ─────────────────────────────────────────────────────
const HB = {
  page:      'dashboard',
  qlFilter:  'all',
  blParsed:  0,
  pollTimer: null,
};

function PAGE_TITLES(id) {
  const map = {
    dashboard:  'nav_dashboard',
    querylog:   'nav_query_log',
    blocklists: 'nav_blocklists',
    rules:      'nav_rules',
    vpn:        'nav_vpn',
    devices:    'nav_devices',
    security:   'nav_security',
    settings:   'nav_settings',
  };
  return (window.HBI18n ? window.HBI18n.t(map[id] || id) : id);
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav click handlers
  document.querySelectorAll('.sb-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      if (page) goPage(page);
    });
  });

  loadSettings();
  goPage('dashboard');
  startPoll();
});

// ── Navigation ────────────────────────────────────────────────
function goPage(id) {
  HB.page = id;
  document.querySelectorAll('.sb-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === id);
  });
  (document.getElementById('topbar-title')||{}).textContent = PAGE_TITLES(id);
  const content = document.getElementById('content');
  content.innerHTML = `<div style="opacity:0.3;font-family:var(--mono);font-size:11px;padding:20px;">${_t('loading')}</div>`;
  renderPage(id);
}

function renderPage(id) {
  switch(id) {
    case 'dashboard':  renderDashboard();  break;
    case 'querylog':   renderQueryLog();   break;
    case 'blocklists': renderBlocklists(); break;
    case 'rules':      renderRules();      break;
    case 'vpn':        renderVPN();        break;
    case 'devices':    renderDevices();    break;
    case 'security':   renderSecurity();   break;
    case 'settings':   renderSettings();   break;
  }
}

// ── Settings load (hostname, username) ───────────────────────
async function loadSettings() {
  try {
    const data = await api('/api/v1/settings');
    if (data.hostname) {
      (document.getElementById('tb-host')||{}).textContent   = data.hostname;
    }
    const u = data.username || 'admin';
    (document.getElementById('sb-uname')||{}).textContent    = u;
    (document.getElementById('sb-avatar')||{}).textContent   = u[0].toUpperCase();
    // Apply saved language preference from server
    if (data.language && window.HBI18n) {
      window.HBI18n.setLocale(data.language);
    }
  } catch(_) {}
}

// ── Poll for live stats ───────────────────────────────────────
function startPoll() {
  // SSE for real-time log updates
  if (HB.sse) { HB.sse.close(); HB.sse = null; }
  HB.sse = new EventSource('/api/v1/stream', { withCredentials: true });
  if (!HB._qCount) HB._qCount = 0;
  if (!HB._bCount) HB._bCount = 0;

  HB.sse.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (!data.domain) return;
      // Persist to in-memory log (survives re-renders)
      if (!HB.liveLog) HB.liveLog = [];
      HB.liveLog.unshift(data);
      if (HB.liveLog.length > 50) HB.liveLog.pop();
      // Update dash-log if visible
      const el = document.getElementById('dash-log');
      if (el) {
        el.insertAdjacentHTML('afterbegin', logRow(data));
        const rows = el.querySelectorAll('.qrow');
        if (rows.length > 50) rows[rows.length - 1].remove();
      }
      // Update counters instantly
      HB._qCount++;
      if (data.action === 'blocked') HB._bCount++;
      const rate = HB._qCount > 0 ? Math.round(HB._bCount / HB._qCount * 1000) / 10 : 0;
      setText('d-queries', fmt(HB._qCount));
      setText('d-blocked', fmt(HB._bCount));
      setText('d-rate', rate + '%');
      setText('nb-log', fmt(HB._bCount));
    } catch(_) {}
  };
  HB.sse.onerror = () => {};

  HB.pollTimer = setInterval(async () => {
    if (HB.page !== 'dashboard') return;
    try {
      const s = await api('/api/v1/stats');
      setText('d-queries', fmt(s.queries_today));
      setText('d-blocked', fmt(s.blocked_today));
      setText('d-rate',    s.block_rate + '%');
      setText('nb-log',    fmt(s.blocked_today));
      setText('nb-bl',     s.active_lists);
    } catch(_) {}
    try {
      const devs = await api('/api/v1/devices');
      const online = devs.filter(d => d.last_seen).length;
      setText('d-devices', devs.length);
      setText('d-devices-sub', online + ' seen recently');
      setText('d-devices-badge', online + ' active');
      const el = document.getElementById('d-devices-list');
      if (el) el.innerHTML = devs.slice(0,4).map(devRow).join('');
    } catch(_) {}
  }, 4000);
}

// ── Dashboard ─────────────────────────────────────────────────
async function renderDashboard() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="stats-row">
        <div class="stat g"><div class="stat-lbl">Queries today</div><div class="stat-val" id="d-queries">—</div><div class="stat-sub" id="d-sub-q"></div></div>
        <div class="stat r"><div class="stat-lbl">Blocked</div><div class="stat-val" id="d-blocked">—</div><div class="stat-sub" id="d-rate">—</div></div>
        <div class="stat b"><div class="stat-lbl">Devices</div><div class="stat-val" id="d-devices">—</div><div class="stat-sub" id="d-devices-sub"></div></div>
        <div class="stat w"><div class="stat-lbl">Active lists</div><div class="stat-val" id="d-lists">—</div><div class="stat-sub">blocklists enabled</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><span class="card-title">VPN Tunnel</span><span class="badge badge-g">WireGuard</span></div>
          <div class="vpn-wrap">
            <div class="vpn-ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
            <div>
              <div class="vpn-name" id="vpn-name">Checking...</div>
              <div class="vpn-detail" id="vpn-detail"></div>
              <div class="vpn-tog-row"><button class="tog" id="vpn-tog" onclick="toggleVpn()"></button><span class="vpn-tog-lbl" id="vpn-lbl">VPN On</span></div>
            </div>
          </div>
          <div class="chart-legend" style="margin-bottom:4px;"><span>Traffic 24h</span><span id="vpn-traffic"></span></div>
          <div class="mini-chart" id="dash-chart"></div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Active Blocklists</span><span class="badge badge-b" id="d-bl-badge">—</span></div>
          <div class="card-body" id="d-bl-body" style="padding:10px 12px;"></div>
        </div>
      </div>
      <div class="grid-3">
        <div class="card">
          <div class="card-head">
            <span class="card-title"><span class="live-dot"></span>Live Query Log</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--muted);cursor:pointer;" onclick="goPage('querylog')">all queries ›</span>
          </div>
          <div id="dash-log"></div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Devices</span><span class="badge badge-g" id="d-devices-badge">—</span></div>
          <div class="card-body" style="padding:8px 10px;" id="d-devices-list"></div>
        </div>
      </div>
    </div>`);

  // Load data in parallel
  const [stats, log, bls, devs, vpnStatus] = await Promise.allSettled([
    api('/api/v1/stats'),
    api('/api/v1/log?limit=50'),
    api('/api/v1/blocklists'),
    api('/api/v1/devices'),
    api('/api/v1/vpn/status'),
  ]);

  if (stats.status === 'fulfilled') {
    const s = stats.value;
    HB._qCount = s.queries_today || 0;
    HB._bCount = s.blocked_today || 0;
    setText('d-queries', fmt(s.queries_today));
    setText('d-blocked',  fmt(s.blocked_today));
    setText('d-rate',     s.block_rate + '% block rate');
    setText('d-lists',    s.active_lists);
    setText('nb-log',     fmt(s.blocked_today));
    setText('nb-bl',      s.active_lists);
    if (s.top_blocked) renderTopBlocked(s.top_blocked);
  }

  if (HB.liveLog && HB.liveLog.length > 0) {
    (document.getElementById('dash-log')||{}).innerHTML = HB.liveLog.slice(0,50).map(logRow).join('');
  } else if (log.status === 'fulfilled') {
    (document.getElementById('dash-log')||{}).innerHTML = log.value.map(logRow).join('');
  }

  if (bls.status === 'fulfilled') {
    const active = bls.value.filter(b => b.enabled);
    setText('d-bl-badge', active.length + ' lists');
    (document.getElementById('d-bl-body')||{}).innerHTML = active.slice(0, 5).map(b =>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);">
        <span style="font-size:12px;">${esc(b.name)}</span>
        <span class="badge badge-g">${b.domain_count.toLocaleString()}</span>
      </div>`).join('') || '<div style="font-family:var(--mono);font-size:10px;color:var(--muted);padding:8px 0;">No active blocklists</div>';
  }

  if (devs.status === 'fulfilled') {
    const online = devs.value.filter(d => d.last_seen).length;
    setText('d-devices',      devs.value.length);
    setText('d-devices-sub',  online + ' seen recently');
    setText('d-devices-badge', online + ' active');
    (document.getElementById('d-devices-list')||{}).innerHTML = devs.value.slice(0, 4).map(devRow).join('');
  }

  if (vpnStatus.status === 'fulfilled') {
    const v = vpnStatus.value;
    setText('vpn-name',   v.running ? _t('vpn_active') : _t('vpn_tunnel_down'));
    setText('vpn-detail', v.running ? 'WireGuard — all traffic tunnelled' : _t('vpn_no_vpn'));
    const vpnTog = document.getElementById('vpn-tog'); if (vpnTog) vpnTog.classList.toggle('off', !v.running);
    setText('vpn-lbl', v.running ? 'VPN On' : _t('vpn_off'));
  }

  buildMiniChart('dash-chart');
}

// ── Query Log ─────────────────────────────────────────────────
async function renderQueryLog() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
        <button class="btn btn-sm" id="ql-all"     onclick="qlFilter('all')"    >All</button>
        <button class="btn btn-ghost btn-sm" id="ql-blocked" onclick="qlFilter('blocked')">Blocked</button>
        <button class="btn btn-ghost btn-sm" id="ql-allowed" onclick="qlFilter('allowed')">Allowed</button>
        <div style="flex:1;"></div>
        <span style="font-family:var(--mono);font-size:10px;color:var(--muted);" id="ql-count"></span>
      </div>
      <div class="card"><div id="ql-rows"></div></div>
    </div>`);
  await loadLog();
}

async function loadLog() {
  const f = HB.qlFilter;
  const data = await api(`/api/v1/log?limit=100&filter=${f}`);
  (document.getElementById('ql-rows')||{}).innerHTML = data.length
    ? data.map(logRow).join('')
    : emptyState(_t('log_empty'));
  setText('ql-count', data.length + ' entries');
  updateQlBtns();
}

function qlFilter(f) { HB.qlFilter = f; loadLog(); }
function updateQlBtns() {
  const f = HB.qlFilter;
  ['all','blocked','allowed'].forEach(x => {
    const b = document.getElementById('ql-' + x);
    if (!b) return;
    b.className = x === f ? 'btn btn-sm btn-primary' : 'btn btn-ghost btn-sm';
  });
}

// ── Blocklists ─────────────────────────────────────────────────
function openBlDrawer() {
  document.getElementById('bl-drawer-overlay').classList.add('open');
  document.getElementById('bl-drawer').classList.add('open');
}
function closeBlDrawer() {
  document.getElementById('bl-drawer-overlay').classList.remove('open');
  document.getElementById('bl-drawer').classList.remove('open');
}

async function renderBlocklists() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Blocklists</span>
          <span class="badge badge-g" id="bl-badge">—</span>
          <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="openBlDrawer()">+ Add Blocklist</button>
        </div>
        <div class="bl-table-head"><span></span><span>Name</span><span>Domains</span><span>Category</span><span>Updated</span><span></span></div>
        <div id="bl-table"></div>
      </div>
      <div class="drawer-overlay" id="bl-drawer-overlay" onclick="closeBlDrawer()"></div>
      <div class="drawer" id="bl-drawer">
        <div class="drawer-head">
          <span>Add Blocklist</span>
          <button class="icon-btn" onclick="closeBlDrawer()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="drawer-body">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Name</label>
            <input class="form-input" id="bl-name" type="text" placeholder="e.g. StevenBlack Ads">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Category</label>
            <select class="form-input" id="bl-cat">
              <option>Ads</option><option>Trackers</option><option>Malware</option>
              <option>Social</option><option>Telemetry</option><option>Adult</option><option>Custom</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">URL</label>
            <input class="form-input" id="bl-url" type="url" placeholder="https://raw.githubusercontent.com/...">
          </div>
          <div class="or-div">or upload file</div>
          <div class="drop-zone" id="drop-zone" onclick="document.getElementById('bl-file').click()"
               ondragover="dzOver(event)" ondragleave="dzLeave()" ondrop="dzDrop(event)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div class="drop-lbl" id="drop-lbl">Drop .txt or hosts file</div>
            <div class="drop-sub">or click to browse</div>
          </div>
          <input type="file" id="bl-file" accept=".txt,.hosts,.list" style="display:none" onchange="handleBlFile(event)">
          <div class="parse-result" id="parse-result">
            <div class="parse-num" id="parse-num">0</div>
            <div class="parse-lbl">domains ready to import</div>
          </div>
          <div class="or-div">presets</div>
          <div class="preset-grid">
            <div class="preset-btn" onclick="loadPreset('StevenBlack','Ads','https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts')"><div class="preset-btn-name">StevenBlack</div><div class="preset-btn-count">186k domains</div></div>
            <div class="preset-btn" onclick="loadPreset('Hagezi Pro','Trackers','https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/pro.txt')"><div class="preset-btn-name">Hagezi Pro</div><div class="preset-btn-count">521k domains</div></div>
            <div class="preset-btn" onclick="loadPreset('Phishing Army','Malware','https://phishing.army/download/phishing_army_blocklist.txt')"><div class="preset-btn-name">Phishing Army</div><div class="preset-btn-count">22k domains</div></div>
            <div class="preset-btn" onclick="loadPreset('EasyList','Ads','https://easylist.to/easylist/easylist.txt')"><div class="preset-btn-name">EasyList</div><div class="preset-btn-count">76k domains</div></div>
            <div class="preset-btn" onclick="loadPreset('WinSpyBlock','Telemetry','https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt')"><div class="preset-btn-name">WinSpyBlock</div><div class="preset-btn-count">240 domains</div></div>
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="addBlocklist()">Add Blocklist</button>
        </div>
      </div>
    </div>`);
  await loadBl();
}

async function loadBl() {
  const data = await api('/api/v1/blocklists');
  const active = data.filter(b => b.enabled);
  setText('bl-badge', active.length + ' active');
  setText('nb-bl', active.length);
  const catMap = {Ads:'r',Trackers:'b',Malware:'w',Social:'b',Telemetry:'g',Adult:'r',Custom:'g'};
  (document.getElementById('bl-table')||{}).innerHTML = data.length
    ? data.map(b => `
      <div class="bl-row">
        <div class="bl-icon">${b.category.slice(0,2).toUpperCase()}</div>
        <div class="bl-name-col">
          <div class="bl-list-name">${esc(b.name)}</div>
          <div class="bl-list-src">${esc(b.source_url || 'uploaded file')}</div>
        </div>
        <div class="bl-count" style="font-family:var(--mono);font-size:11px;">${b.domain_count.toLocaleString()}</div>
        <div><span class="badge badge-${catMap[b.category]||'g'}">${esc(b.category)}</span></div>
        <div class="bl-updated">${esc(b.last_updated || '—')}</div>
        <div class="bl-actions">
          <button class="mtog ${b.enabled ? '' : 'off'}" onclick="toggleBl(${b.id},${!b.enabled})"></button>
          <div class="icon-btn" onclick="deleteBl(${b.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </div>
        </div>
      </div>`).join('')
    : emptyState(_t('bl_empty'));
}

async function toggleBl(id, enabled) {
  await api(`/api/v1/blocklists/${id}?enabled=${enabled}`, {method:'PATCH'});
  toast(enabled ? _t('bl_enabled_msg') : _t('bl_disabled_msg'));
  loadBl();
}

async function deleteBl(id) {
  await api(`/api/v1/blocklists/${id}`, {method:'DELETE'});
  toast(_t('bl_removed_msg'));
  loadBl();
}

function loadPreset(name, cat, url) {
  document.getElementById('bl-name').value = name;
  document.getElementById('bl-cat').value  = cat;
  document.getElementById('bl-url').value  = url;
  toast(_t('bl_preset_loaded'));
}

async function addBlocklist() {
  const name = document.getElementById('bl-name').value.trim();
  const cat  = document.getElementById('bl-cat').value;
  const url  = document.getElementById('bl-url').value.trim();
  if (!name) { toast(_t('bl_enter_name')); return; }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('category', cat);
  if (url) fd.append('source_url', url);

  const fileInput = document.getElementById('bl-file');
  if (fileInput.files.length && !url) {
    fd.append('file', fileInput.files[0]);
    await apiFd('/api/v1/blocklists/upload', fd);
  } else {
    try {
      const result = await apiFd('/api/v1/blocklists', fd);
    } catch(e) {
      const msg = e.message || 'Failed to add blocklist';
      toast('Error: ' + msg, 'error');
      return;
    }
  }
  toast('"' + name + '" added — fetching domains in background...');
  document.getElementById('bl-name').value = '';
  document.getElementById('bl-url').value  = '';
  document.getElementById('parse-result').classList.remove('show');
  HB.blParsed = 0;
  loadBl();
}

function dzOver(e) { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag'); }
function dzLeave()  { document.getElementById('drop-zone').classList.remove('drag'); }
function dzDrop(e)  { e.preventDefault(); dzLeave(); const f = e.dataTransfer.files[0]; if(f) processBlFile(f); }
function handleBlFile(e) { const f = e.target.files[0]; if(f) processBlFile(f); }
function processBlFile(file) {
  const r = new FileReader();
  r.onload = ev => {
    const lines = ev.target.result.split('\n');
    const doms = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)/);
      if (m) { const d = m[1]; if (!['localhost','0.0.0.0','broadcasthost'].includes(d)) doms.push(d); continue; }
      if (/^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/.test(t)) doms.push(t);
    }
    HB.blParsed = doms.length;
    (document.getElementById('drop-lbl')||{}).textContent = file.name + ' — ' + doms.length.toLocaleString() + ' domains';
    (document.getElementById('parse-num')||{}).textContent = doms.length >= 1000 ? Math.round(doms.length/1000) + 'k' : doms.length;
    document.getElementById('parse-result').classList.add('show');
    if (!document.getElementById('bl-name').value) document.getElementById('bl-name').value = file.name.replace(/\.[^.]+$/, '');
    toast(_t('bl_parsed') + ' ' + doms.length.toLocaleString() + ' ' + _t('bl_domains_suffix') + ' — ' + file.name);
  };
  r.readAsText(file);
}

// ── Rules ──────────────────────────────────────────────────────
async function renderRules() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="card">
        <div class="card-head"><span class="card-title">Custom Allow / Block Rules</span><span style="font-family:var(--mono);font-size:9px;color:var(--muted);">overrides all blocklists</span></div>
        <div class="card-body">
          <div style="display:flex;gap:8px;margin-bottom:14px;">
            <input class="form-input" id="rule-domain" type="text" placeholder="domain.com" style="flex:1;">
            <select class="form-input" id="rule-type" style="width:110px;"><option value="deny">Block</option><option value="allow">Allow</option></select>
            <button class="btn btn-primary btn-sm" onclick="addRule()">Add</button>
          </div>
          <div id="rules-list"></div>
        </div>
      </div>
    </div>`);
  loadRules();
}

async function loadRules() {
  const data = await api('/api/v1/rules');
  const rl = document.getElementById('rules-list'); if (!rl) return; rl.innerHTML = data.length
    ? data.map(r => `
      <div class="dev-item">
        <span class="badge ${r.rule_type==='allow'?'badge-g':'badge-r'}">${r.rule_type}</span>
        <span style="flex:1;font-family:var(--mono);font-size:12px;margin:0 10px;">${esc(r.domain)}</span>
        <div class="icon-btn" onclick="deleteRule(${r.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </div>
      </div>`).join('')
    : emptyState(_t('rules_empty'));
}

async function addRule() {
  const domain = document.getElementById('rule-domain').value.trim();
  const type   = document.getElementById('rule-type').value;
  if (!domain) return;
  await api('/api/v1/rules', {method:'POST', json:{domain, rule_type:type}});
  document.getElementById('rule-domain').value = '';
  toast(_t('rules_added') + ': ' + type + ' ' + domain);
  loadRules();
}

async function deleteRule(id) {
  await api(`/api/v1/rules/${id}`, {method:'DELETE'});
  toast(_t('rules_removed'));
  loadRules();
}

// ── VPN ────────────────────────────────────────────────────────
async function renderVPN() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><span class="card-title">WireGuard Status</span><span class="badge badge-g" id="vpn-status-badge">Checking</span></div>
          <div class="vpn-wrap">
            <div class="vpn-ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
            <div>
              <div class="vpn-name" id="vpn2-name">—</div>
              <div class="vpn-detail" id="vpn2-detail" style="margin-top:4px;"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Add Device</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;align-items:center;gap:14px;">
            <input class="form-input" id="new-device-name" type="text" placeholder="Device name e.g. Mikes iPhone" style="width:100%;">
            <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="addDevice()">Generate WireGuard Config</button>
            <div id="qr-result" style="display:none;flex-direction:column;align-items:center;gap:10px;width:100%;">
              <img id="qr-img" style="width:140px;height:140px;border:4px solid #fff;" alt="WireGuard QR code">
              <div style="font-family:var(--mono);font-size:10px;color:var(--muted);text-align:center;line-height:1.6;">Scan with WireGuard app to connect</div>
              <button class="btn btn-ghost" style="width:100%;justify-content:center;font-size:11px;" onclick="downloadConfig()">Download Config File</button>
            </div>
          </div>
        </div>
      </div>
    </div>`);
  HB._wgConfig = null;
  const v = await api('/api/v1/vpn/status');
  setText('vpn2-name',   v.running ? _t('vpn_active') : _t('vpn_tunnel_down'));
  setText('vpn2-detail', v.running ? 'WireGuard — all traffic tunnelled' : _t('docker_logs_hint'));
  const badge = document.getElementById('vpn-status-badge');
  if (badge) { badge.textContent = v.running ? _t('active') : _t('vpn_offline'); badge.className = v.running ? 'badge badge-g' : 'badge badge-r'; }
}

async function addDevice() {
  const name = document.getElementById('new-device-name').value.trim();
  if (!name) { toast(_t('dev_enter_name')); return; }
  const data = await api('/api/v1/devices', {method:'POST', json:{name}});
  HB._wgConfig = data.config;
  const qrResult = document.getElementById('qr-result');
  qrResult.style.display = 'flex';
  document.getElementById('qr-img').src = 'data:image/png;base64,' + data.qr_b64;
  toast('"' + name + '" added — scan the QR code to connect');
}

function downloadConfig() {
  if (!HB._wgConfig) return;
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(HB._wgConfig);
  a.download = 'hexblock.conf';
  a.click();
}

function toggleVpn() {
  toast(_t('vpn_control'));
}

// ── Devices ────────────────────────────────────────────────────
async function renderDevices() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="card">
        <div class="card-head"><span class="card-title">Connected Devices</span>
          <button class="btn btn-primary btn-sm" onclick="goPage('vpn')">Add Device</button>
        </div>
        <div class="card-body" id="all-devices"></div>
      </div>
    </div>`);
  const data = await api('/api/v1/devices');
  (document.getElementById('all-devices')||{}).innerHTML = data.length
    ? data.map(d => devRow(d, true)).join('')
    : emptyState(_t('dev_empty'));
}

// ── Security ───────────────────────────────────────────────────
async function renderSecurity() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="grid-2" style="align-items:start;">
        <div>
          <div class="card">
            <div class="card-head"><span class="card-title">Account</span></div>
            <div class="card-body" style="padding:10px;">
              <div class="sec-row">
            <div class="sec-label-left">
              <div class="sec-row-label">Change password</div>
              <div class="sec-row-hint">Last changed: today</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="showPwModal()">Change</button>
          </div>
          <div id="pw-modal" style="display:none;margin-top:10px;background:var(--s3);border:1px solid var(--line);padding:14px;">
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Current password</label>
              <input class="form-input" id="pw-current" type="password" autocomplete="current-password">
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">New password</label>
              <input class="form-input" id="pw-new" type="password" autocomplete="new-password">
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Confirm new password</label>
              <input class="form-input" id="pw-confirm" type="password" autocomplete="new-password">
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="submitPwChange()">Save</button>
              <button class="btn btn-ghost btn-sm" onclick="hidePwModal()">Cancel</button>
            </div>
          </div>
              <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Two-factor auth (TOTP)</div><div class="sec-row-hint" id="totp-status">Loading...</div></div><button class="btn btn-primary btn-sm" id="totp-btn" onclick="toggleTotp()">Enable</button></div>
              <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Session timeout</div><div class="sec-row-hint">Auto logout after inactivity</div></div>
                <select class="form-input" style="width:100px;padding:5px 8px;font-size:11px;"><option>30 min</option><option selected>1 hour</option><option>4 hours</option></select>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">Login Protection</span></div>
            <div class="card-body" style="padding:10px;">
              <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Brute-force lockout</div><div class="sec-row-hint">Lock after 5 failed attempts</div></div><button class="tog"></button></div>
              <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">HTTPS only</div><div class="sec-row-hint">Enforce via reverse proxy</div></div><button class="tog"></button></div>
              <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Audit logging</div><div class="sec-row-hint">Log all admin actions</div></div><button class="tog"></button></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Audit Log</span><span class="badge badge-b">last 20</span></div>
          <div id="audit-list"></div>
        </div>
      </div>
    </div>`);

  const audit = await api('/api/v1/audit?limit=20');
  (document.getElementById('audit-list')||{}).innerHTML = audit.length
    ? audit.map(a => `
      <div class="audit-row">
        <span class="audit-time">${esc(a.logged_at ? a.logged_at.slice(11,16) : '—')}</span>
        <span class="audit-action">${esc(a.action)}</span>
        <span class="audit-who">${esc(a.ip_address || 'system')}</span>
      </div>`).join('')
    : emptyState(_t('sec_audit_empty'));
}

async function toggleTotp() {
  toast(_t('sec_totp_soon'));
}

function showPwModal() {
  const m = document.getElementById('pw-modal');
  if (m) m.style.display = 'block';
}
function hidePwModal() {
  const m = document.getElementById('pw-modal');
  if (m) m.style.display = 'none';
  ['pw-current','pw-new','pw-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}
async function submitPwChange() {
  const current = document.getElementById('pw-current')?.value || '';
  const newPw   = document.getElementById('pw-new')?.value    || '';
  const confirm = document.getElementById('pw-confirm')?.value || '';
  if (!current || !newPw || !confirm) { toast(_t('sec_all_required')); return; }
  if (newPw !== confirm) { toast(_t('sec_pw_mismatch')); return; }
  if (newPw.length < 12) { toast(_t('sec_pw_short')); return; }
  try {
    await api('/api/v1/account/password', {
      method: 'POST',
      json: { current_password: current, new_password: newPw, confirm_password: confirm },
    });
    toast(_t('sec_pw_changed'));
    hidePwModal();
  } catch (e) {
    toast(_t('sec_pw_failed'));
  }
}

// ── Settings ───────────────────────────────────────────────────
async function renderSettings() {
  setContent(`
    <div style="animation:pagein 0.2s ease both;">
      <div class="card">
        <div class="card-head"><span class="card-title">General</span></div>
        <div class="card-body" style="padding:10px;">
          <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Auto-update blocklists</div><div class="sec-row-hint">Refresh all lists daily at 3am</div></div><button class="tog" onclick="this.classList.toggle('off')"></button></div>
          <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Log DNS queries</div><div class="sec-row-hint">Retain 7 days of query history</div></div><button class="tog" onclick="this.classList.toggle('off')"></button></div>
          <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Safe search enforcement</div><div class="sec-row-hint">Force safe search on Google, Bing, YouTube</div></div><button class="tog off" onclick="this.classList.toggle('off')"></button></div>
          <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">DNS over HTTPS upstream</div><div class="sec-row-hint">Encrypt queries to upstream DNS</div></div><button class="tog" onclick="this.classList.toggle('off')"></button></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title" data-i18n="set_language">Language</span></div>
        <div class="card-body" style="padding:14px;">
          <div class="sec-row">
            <div class="sec-label-left">
              <div class="sec-row-label" data-i18n="set_language">Language</div>
              <div class="sec-row-hint">Dashboard display language</div>
            </div>
            <div id="lang-picker-wrap"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">Reverse Proxy</span><span class="badge badge-b">Optional</span></div>
        <div class="card-body">
          <div class="proxy-note">Enable these settings when HexBlock is behind Nginx, Caddy, or Traefik. Set TRUST_PROXY=1 and ALLOWED_HOSTS in your .env file, then reload the container.</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
            <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Trust proxy headers</div><div class="sec-row-hint">TRUST_PROXY=1 in .env — enables X-Forwarded-For handling</div></div><span class="badge" id="proxy-status" style="background:var(--s3);color:var(--muted);">Off</span></div>
            <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Allowed hosts</div><div class="sec-row-hint">ALLOWED_HOSTS=hexblock.example.com in .env</div></div><span class="badge badge-g" id="allowed-hosts-val">*</span></div>
            <div class="sec-row"><div class="sec-label-left"><div class="sec-row-label">Sub-path prefix</div><div class="sec-row-hint">ROOT_PATH=/hexblock in .env — only needed for sub-path deploys</div></div><span class="badge" id="root-path-val" style="background:var(--s3);color:var(--muted);">none</span></div>
          </div>
          <div style="margin-top:14px;font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;">Config examples</div>
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <button class="btn btn-ghost btn-sm" onclick="showProxyExample('nginx')">Nginx</button>
            <button class="btn btn-ghost btn-sm" onclick="showProxyExample('caddy')">Caddy</button>
            <button class="btn btn-ghost btn-sm" onclick="showProxyExample('traefik')">Traefik</button>
          </div>
          <div id="proxy-example"></div>
        </div>
      </div>

    </div>`);

  const [s, sys] = await Promise.all([
    api('/api/v1/settings'),
    api('/api/v1/system'),
  ]);

  // Proxy status from runtime env vars
  if (sys.trust_proxy || sys.trust_cloudflare) {
    const el = document.getElementById('proxy-status');
    if (el) {
      el.textContent = sys.trust_cloudflare ? _t('vpn_tunnel') : _t('enabled');
      el.className = 'badge badge-g';
    }
  }
  if (sys.allowed_hosts) setText('allowed-hosts-val', sys.allowed_hosts);
  if (sys.root_path)     setText('root-path-val', sys.root_path || 'none');
}

function showProxyExample(proxy) {
  const examples = {
    nginx: `# Nginx — .env: TRUST_PROXY=1, ALLOWED_HOSTS=hexblock.example.com
location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
}`,
    caddy: `# Caddy — .env: TRUST_PROXY=1, ALLOWED_HOSTS=hexblock.example.com
hexblock.example.com {
    reverse_proxy localhost:8080 {
        header_up X-Forwarded-For   {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}`,
    traefik: `# Traefik label — .env: TRUST_PROXY=1
- "traefik.enable=true"
- "traefik.http.routers.hexblock.rule=Host('hexblock.example.com')"
- "traefik.http.routers.hexblock.entrypoints=websecure"
- "traefik.http.routers.hexblock.tls.certresolver=letsencrypt"
- "traefik.http.services.hexblock.loadbalancer.server.port=8080"`,
  };
  (document.getElementById('proxy-example')||{}).innerHTML =
    `<div class="code-block">${esc(examples[proxy])}</div>`;
}

// ── Sync ──────────────────────────────────────────────────────
async function syncLists() {
  const btn = document.getElementById('btn-sync');
  if (btn) { btn.disabled = true; btn.textContent = _t('bl_syncing'); }
  await api('/api/v1/blocklists/sync', {method:'POST'});
  toast(_t('bl_synced_msg'));
  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3"/></svg> Sync Lists'; }
}

// ── Helpers ───────────────────────────────────────────────────
function renderTopBlocked(data) {
  const el = document.getElementById('d-top-blocked');
  if (!el) return;
  el.innerHTML = data.map(d =>
    `<div style="display:flex;justify-content:space-between;padding:4px 0;font-family:var(--mono);font-size:10px;">
      <span style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">${esc(d.domain)}</span>
      <span style="color:var(--r);margin-left:8px;">${d.count}</span>
    </div>`
  ).join('');
}

function logRow(e) {
  return `<div class="qrow">
    <span class="qdot ${e.action==='allowed'?'a':'b'}"></span>
    <span class="qdom">${esc(e.domain)}</span>
    <span class="qtag ${e.action==='allowed'?'a':'b'}">${e.action}</span>
    <span class="qdev">${esc(e.device_name||e.client_ip||'—')}</span>
    <span class="qt">${esc(e.logged_at ? e.logged_at.slice(11,16) : '—')}</span>
  </div>`;
}

function devRow(d, showDelete) {
  const initials = d.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return `<div class="dev-item">
    <div class="dev-av">${initials}</div>
    <div><div class="dev-name">${esc(d.name)}</div><div class="dev-ip">${esc(d.wg_assigned_ip||d.ip_address||'—')}</div></div>
    <div class="dev-right">
      <div class="dev-status ${d.last_seen?'':'off'}">${d.last_seen?'seen':'not seen'}</div>
      <div class="dev-q">${esc(d.created_at ? d.created_at.slice(0,10) : '—')}</div>
    </div>
    ${showDelete ? `<div class="icon-btn" onclick="deleteDevice(${d.id})" style="margin-left:8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></div>` : ''}
  </div>`;
}

async function deleteDevice(id) {
  await api(`/api/v1/devices/${id}`, {method:'DELETE'});
  toast(_t('dev_removed'));
  renderDevices();
}

function buildMiniChart(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const data = [22,34,28,46,31,50,42,29,38,35,42,37];
  const max  = Math.max(...data);
  el.innerHTML = data.map(v => {
    const h  = Math.round((v/max)*36);
    const bh = Math.round(h*0.28);
    return `<div class="mc-wrap" style="height:${h}px"><div class="mc-total" style="height:100%"></div><div class="mc-blocked" style="height:${bh}px"></div></div>`;
  }).join('');
}

function emptyState(msg) {
  return `<div style="padding:24px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:0.06em;">${esc(msg)}</div>`;
}

function setContent(html) { document.getElementById('content').innerHTML = html; }
function setText(id, val) { const el=document.getElementById(id); if(el) el.textContent = val; }
function fmt(n) { return (n||0).toLocaleString(); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type) {
  const t = document.getElementById('toast');
  (document.getElementById('toast-msg')||{}).textContent = msg;
  t.classList.add('show');
  t.classList.toggle('toast-error', type === 'error');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); t.classList.remove('toast-error'); }, 3200);
}

// ── i18n shorthand ────────────────────────────────────────────
function _t(key, vars) {
  return window.HBI18n ? window.HBI18n.t(key, vars) : key;
}

// ── API helpers ───────────────────────────────────────────────
async function api(url, opts={}) {
  const options = { headers: {} };
  if (opts.method) options.method = opts.method;
  if (opts.json)   { options.method = options.method||'POST'; options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(opts.json); }
  const r = await fetch(url, options);
  if (!r.ok) { if (r.status === 401) { window.location = '/login'; } throw new Error(r.status); }
  return r.json();
}
async function apiFd(url, fd) {
  const r = await fetch(url, {method:'POST', body:fd});
  if (!r.ok) {
    try {
      const err = await r.json();
      throw new Error(err.detail || r.status);
    } catch(e) {
      throw e;
    }
  }
  return r.json();
}
