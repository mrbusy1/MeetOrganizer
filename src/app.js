/* MeetOrganizer Pro — renderer application
 * Design & Developed by Mr.Busy — https://ai-1.art/
 */
(function () {
  'use strict';
  const E = window.ENGINE;
  const MO = window.MO;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const GH = {
    repo: 'https://github.com/mrbusy1/MeetOrganizer',
    profile: 'https://github.com/mrbusy1',
    releases: 'https://github.com/mrbusy1/MeetOrganizer/releases'
  };

  const S = {
    view: 'overview',
    settings: Object.assign({}, E.DEFAULT_SETTINGS),
    rules: clone(E.DEFAULT_RULES),
    info: {},
    root: '',
    files: [], plan: [], sessions: [], activity: [], logs: [],
    dupInfo: { groups: [], extras: new Map(), reclaimable: 0, count: 0 },
    scanning: false, organizing: false, sorterFinished: false,
    showOptions: false, visibleRows: 150, filter: '', sort: 'name',
    categoryFilter: '', selectedOnly: false, watchActive: false,
    lastSummary: null, scheduler: null, searchTimer: null, githubStarred: false
  };

  /* ------------------------------------------------------------- utilities */
  function hydrateIcons(root) {
    $$('[data-icon]', root || document).forEach((el) => {
      el.innerHTML = E.icon(el.dataset.icon, Number(el.dataset.size) || 16);
    });
  }
  function toast(message, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'success');
    el.innerHTML = E.icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'checkCircle', 16) + '<span>' + E.esc(message) + '</span>';
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(14px)'; }, 3400);
    setTimeout(() => el.remove(), 3800);
  }
  function persist() {
    MO.set('settings', S.settings);
    MO.set('rules', S.rules);
    MO.set('activity', S.activity.slice(0, 40));
  }
  function addActivity(text, iconName) {
    S.activity.unshift({ text, icon: iconName || 'check', time: new Date().toISOString() });
    S.activity = S.activity.slice(0, 40);
    MO.set('activity', S.activity);
  }
  function addLog(text) {
    S.logs.unshift({ text, time: new Date().toISOString() });
    S.logs = S.logs.slice(0, 60);
  }
  function applyTheme() {
    document.documentElement.dataset.theme = S.settings.theme;
    document.documentElement.dataset.accent = S.settings.accent;
  }
  function btn(action, label, glyph, variant, extra) {
    return '<button class="btn ' + (variant || 'btn-soft') + '" data-action="' + action + '" ' + (extra || '') + '>' +
      (glyph ? E.icon(glyph, 15) : '') + '<span>' + E.esc(label) + '</span></button>';
  }
  function sw(key) {
    return '<div class="switch ' + (S.settings[key] ? 'on' : '') + '" data-action="toggle-setting" data-key="' + key + '" role="switch" aria-checked="' + !!S.settings[key] + '"></div>';
  }
  function sel(key, options, current, extra) {
    return '<select class="select" data-setting="' + key + '" ' + (extra || '') + '>' + options.map((o) => {
      const v = Array.isArray(o) ? o[0] : o, label = Array.isArray(o) ? o[1] : o;
      return '<option value="' + E.esc(v) + '"' + (String(v) === String(current) ? ' selected' : '') + '>' + E.esc(label) + '</option>';
    }).join('') + '</select>';
  }
  function inp(key, value, type, placeholder) {
    return '<input class="input" data-setting="' + key + '" type="' + (type || 'text') + '" value="' + E.esc(value) + '" placeholder="' + E.esc(placeholder || '') + '">';
  }
  function settingRow(title, desc, control) {
    return '<div class="setting-row"><div class="setting-info"><strong>' + E.esc(title) + '</strong><small>' + E.esc(desc) + '</small></div><div class="setting-control">' + control + '</div></div>';
  }
  function panelHead(title, sub, glyph, actions) {
    return '<div class="panel-head"><div><h3 class="panel-title">' + (glyph ? E.icon(glyph, 16) : '') + E.esc(title) + '</h3>' +
      (sub ? '<p class="panel-sub">' + E.esc(sub) + '</p>' : '') + '</div>' +
      (actions ? '<div class="panel-actions">' + actions + '</div>' : '') + '</div>';
  }
  function empty(title, text, glyph, actionLabel, action) {
    return '<div class="empty-state"><div class="empty-ic">' + E.icon(glyph || 'folder', 26) + '</div><h3>' + E.esc(title) + '</h3>' +
      '<p>' + E.esc(text) + '</p>' + (action ? btn(action, actionLabel, 'refresh', 'btn-primary') : '') + '</div>';
  }
  function rule(id) { return E.ruleById(S.rules, id); }
  function fileGlyph(id) { return (rule(id).glyph || 'file'); }
  function catBadge(id) {
    const r = rule(id);
    return '<span class="badge" style="background:' + r.color + '18;color:' + r.color + '"><span class="badge-dot" style="background:' + r.color + '"></span>' + E.esc(r.name) + '</span>';
  }

  /* -------------------------------------------------------------- bootstrap */
  let booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    try {
      const results = await Promise.all([MO.info(), MO.get('settings'), MO.get('rules'), MO.get('activity'), MO.get('githubStar')]);
      S.info = results[0] || {};
      S.settings = Object.assign({}, E.DEFAULT_SETTINGS, results[1] || {});
      if (!Array.isArray(S.settings.excludes)) S.settings.excludes = E.DEFAULT_SETTINGS.excludes.slice();
      if (!Array.isArray(S.settings.watchFolders)) S.settings.watchFolders = [];
      S.rules = Array.isArray(results[2]) && results[2].length ? results[2] : clone(E.DEFAULT_RULES);
      S.activity = Array.isArray(results[3]) ? results[3] : [];
      S.githubStarred = !!results[4];
      S.root = S.settings.defaultFolder || S.info.downloads || '';
    } catch (err) { console.warn('boot', err); }

    const initialView = new URLSearchParams(location.search).get('view');
    if (initialView) S.view = initialView;

    applyTheme();
    hydrateIcons(document);
    updateGithubCard();
    if (!MO.isDesktop) {
      const wc = $('#winControls'); if (wc) wc.style.display = 'none';
      $('#footerMode').textContent = 'Preview mode';
      $('#titlebar').style.webkitAppRegion = 'no-drag';
    } else {
      $('#footerMode').textContent = 'Desktop · ' + (S.info.platform || 'local');
    }
    $('#footerVersion').textContent = 'v' + (S.info.version || '2.0.0');
    updatePathChip();
    bindEvents();
    await refreshSessions();
    render();
    setupScheduler();
    if (S.settings.autoOrganize && S.settings.watchFolders.length) startWatch();
    if (S.root) runScan(true);
  }

  function updatePathChip() {
    const label = $('#pathLabel');
    if (label) label.textContent = S.root ? S.root.replace(/[\\/]+$/, '') : 'No folder selected';
    const chip = $('#pathChip');
    if (chip) chip.title = S.root || 'Choose a folder';
  }

  async function refreshSessions() {
    try { S.sessions = await MO.sessions() || []; } catch (_) { S.sessions = []; }
  }

  /* Sidebar GitHub card: star state is remembered locally, the actual star
   * is placed by the user on github.com (no token ever leaves this machine). */
  function updateGithubCard() {
    const btn = $('#ghStarBtn');
    if (!btn) return;
    btn.classList.toggle('starred', S.githubStarred);
    btn.innerHTML = E.icon('star', 13) + '<span>' + (S.githubStarred ? 'Starred' : 'Give a star') + '</span>';
    btn.title = S.githubStarred ? 'Repository starred — open it again' : 'Star this repository on GitHub';
  }

  function bindEvents() {
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);

    MO.on('scan:progress', (p) => {
      const el = $('#scanProgress');
      if (el && p && !p.done) el.textContent = E.formatNumber(p.count) + ' files found…';
    });
    MO.on('hash:progress', (p) => {
      const el = $('#scanProgress');
      if (el && p) el.textContent = 'Hashing ' + E.formatNumber(p.index) + '/' + E.formatNumber(p.total) + '…';
    });
    MO.on('organize:progress', (p) => updateSorter(p));
    MO.on('organize:done', (session) => finishOrganize(session));
    MO.on('watch:change', (p) => {
      addLog('Change detected in ' + (p.folder || 'watched folder') + (p.filename ? ' · ' + p.filename : ''));
      if (S.view === 'automation') render();
      if (S.settings.autoOrganize && !S.organizing && !S.scanning) {
        addLog('Auto-organize triggered');
        runScan(true).then(() => { if (S.plan.length) doOrganize(false, true); });
      }
    });
    $('#siteLink').addEventListener('click', (e) => { e.preventDefault(); MO.openExternal('https://ai-1.art/'); });
  }

  function onKey(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'o') { e.preventDefault(); pickFolder(); }
    else if (e.key.toLowerCase() === 'f') { e.preventDefault(); const el = $('[data-filter]'); if (el) el.focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (S.plan.length && !S.organizing) doOrganize(false); }
    else if (e.key.toLowerCase() === 'z' && !e.target.matches('input,textarea,select')) {
      const last = S.sessions.find((s) => !s.undone);
      if (last) undoSession(last.id);
    }
  }

  /* ----------------------------------------------------------------- render */
  function render() {
    const focus = document.activeElement;
    const focusId = focus && focus.dataset ? focus.dataset.filter : null;
    let selStart = null;
    try { selStart = focus && focus.selectionStart; } catch (_) {}

    applyTheme();
    $$('#nav .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === S.view));
    const titles = { overview: 'Overview', organizer: 'Organizer', duplicates: 'Duplicates', rules: 'Rules', automation: 'Auto Organize', history: 'History', settings: 'Settings', about: 'About & Credits' };
    $('#tbCrumb').innerHTML = 'Workspace <span>/</span> <strong>' + (titles[S.view] || '') + '</strong>';
    updatePathChip();
    $('#navPlanCount').textContent = E.formatNumber(S.plan.length);
    $('#navDupCount').textContent = E.formatNumber(S.dupInfo.count);
    const dot = $('#watchDot'); if (dot) dot.hidden = !S.watchActive;

    const views = { overview: viewOverview, organizer: viewOrganizer, duplicates: viewDuplicates, rules: viewRules, automation: viewAutomation, history: viewHistory, settings: viewSettings, about: viewAbout };
    $('#view').innerHTML = (views[S.view] || viewOverview)();
    hydrateIcons($('#view'));

    if (focusId) {
      const el = $('[data-filter]');
      if (el) { el.focus(); try { el.setSelectionRange(selStart, selStart); } catch (_) {} }
    }
  }

  /* --------------------------------------------------------------- overview */
  function overviewSource() {
    if (S.plan.length) return S.plan;
    if (S.files.length) return E.buildPlan(S.files, S.rules, S.settings, S.root, { extras: new Map() });
    return [];
  }
  function categoryBreakdown() {
    const src = overviewSource();
    const map = new Map();
    let total = 0;
    for (const f of src) {
      map.set(f.category, (map.get(f.category) || 0) + f.size);
      total += f.size;
    }
    return { list: Array.from(map, ([id, size]) => ({ id, size, rule: rule(id) })).sort((a, b) => b.size - a.size), total };
  }
  function viewOverview() {
    const { list, total } = categoryBreakdown();
    const top = list.slice(0, 6);
    const rest = list.slice(6).reduce((s, x) => s + x.size, 0);
    const slices = top.map((x) => ({ label: x.rule.name, color: x.rule.color, value: x.size }));
    if (rest > 0) slices.push({ label: 'Other categories', color: '#64748b', value: rest });
    let acc = 0;
    const gradient = slices.length
      ? slices.map((s) => { const from = (acc / total) * 100; acc += s.value; return s.color + ' ' + from.toFixed(2) + '% ' + ((acc / total) * 100).toFixed(2) + '%'; }).join(', ')
      : 'var(--panel-3) 0 100%';
    const donut = '<div class="donut" style="background:conic-gradient(' + gradient + ')"><div class="donut-center"><div><strong>' + E.formatNumber(overviewSource().length) + '</strong><span>files mapped</span></div></div></div>';
    const legend = slices.length ? slices.map((s) => '<div class="legend-row"><span class="legend-dot" style="background:' + s.color + '"></span><span class="legend-name">' + E.esc(s.label) + '</span><span class="legend-val">' + E.formatBytes(s.value) + '</span></div>').join('') : '<p class="hint">Scan a folder to see how your files are distributed.</p>';
    const bars = list.slice(0, 6).map((x) => '<div class="bar-row"><div class="bar-top"><span><span class="legend-dot" style="background:' + x.rule.color + '"></span>' + E.esc(x.rule.name) + '</span><span class="bar-val">' + E.formatBytes(x.size) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + (total ? (x.size / total * 100).toFixed(1) : 0) + '%;background:linear-gradient(90deg,' + x.rule.color + ',' + x.rule.color + '88)"></div></div></div>').join('') || '<p class="hint">No data yet.</p>';

    const scanCount = S.plan.length || S.files.length;
    const stats = [
      ['drive', E.formatNumber(scanCount), 'Files in current plan', 'Local scan · no upload', 'folder'],
      ['copy', E.formatBytes(S.dupInfo.reclaimable), 'Reclaimable space', S.dupInfo.count + ' duplicate copies found', 'copy'],
      ['sliders', E.formatNumber(S.rules.filter((r) => r.enabled).length), 'Active rules', S.rules.filter((r) => r.custom).length + ' custom rules', 'sliders'],
      ['shield', 'Unlimited', 'No restrictions', 'No account · no quota · no paywall', 'shield']
    ].map((s) => '<div class="card stat-card"><div class="stat-ic">' + E.icon(s[4], 17) + '</div><div class="stat-value">' + E.esc(s[1]) + '</div><div class="stat-label">' + E.esc(s[2]) + '</div><div class="stat-trend">' + E.icon('checkCircle', 12) + E.esc(s[3]) + '</div></div>').join('');

    const unlock = E.UNLOCKED.map(([oldText, newText]) => '<div class="unlock-row"><span class="unlock-old">' + E.esc(oldText) + '</span>' + E.icon('arrow', 12) + '<span class="unlock-new">' + E.esc(newText) + '</span></div>').join('');
    const activity = S.activity.length ? S.activity.slice(0, 5).map((a) => '<div class="activity-item"><div class="activity-ic">' + E.icon(a.icon || 'check', 13) + '</div><div><p>' + E.esc(a.text) + '</p><time>' + E.esc(E.timeAgo(a.time)) + '</time></div></div>').join('') : '<p class="hint">Your organizing activity will appear here.</p>';

    return '' +
      '<div class="hero"><div class="hero-inner"><div class="eyebrow">MeetOrganizer Pro · Unlimited Edition</div>' +
      '<h1>Bring order to <em>every folder.</em></h1>' +
      '<p>Scan deep, catch duplicates by content, apply unlimited custom rules, and watch the Sorter tuck everything into place — with a full undo, live folder watching and zero restrictions. All on your machine.</p>' +
      '<div class="hero-actions">' + btn('scan', S.scanning ? 'Scanning…' : 'Scan folder', 'refresh', 'btn-primary') + btn('pick-folder', 'Choose folder', 'folderPlus', 'btn-soft') + btn('goto-organizer', 'Review plan', 'wand', 'btn-ghost') + '</div>' +
      '<div id="scanProgress" class="hint" style="margin-top:12px;min-height:14px">' + (S.scanning ? 'Scanning…' : '') + '</div></div>' +
      '<div class="hero-visual"><div class="orbit o1"></div><div class="orbit o2"></div><div class="hero-folder">' + E.icon('folder', 38) + '</div><div class="float-file f1">' + E.icon('image', 18) + '</div><div class="float-file f2">' + E.icon('video', 18) + '</div><div class="float-file f3">' + E.icon('file', 18) + '</div></div></div>' +
      '<div class="stat-grid">' + stats + '</div>' +
      '<div class="panel-grid"><div class="panel">' + panelHead('Where your space goes', 'Live breakdown of the current folder plan', 'chart') + '<div class="donut-wrap">' + donut + '<div class="legend">' + legend + '</div></div></div>' +
      '<div class="panel">' + panelHead('Limitations, removed', 'What this edition unlocks beyond the original app', 'bolt') + '<div class="unlock-list">' + unlock + '</div></div></div>' +
      '<div class="panel-grid"><div class="panel">' + panelHead('Category sizes', 'Largest groups first', 'layers') + bars + '</div>' +
      '<div class="panel">' + panelHead('Recent activity', 'Everything stays on this device', 'history', btn('goto-history', 'View all', 'arrow', 'btn-ghost btn-sm')) + activity + '</div></div>' +
      '<div class="quick-grid" style="margin-bottom:16px">' +
      '<button class="card quick-card" data-action="scan-downloads"><span class="quick-ic">' + E.icon('download', 18) + '</span><span><strong>Scan Downloads</strong><small>Start with the classic pile</small></span></button>' +
      '<button class="card quick-card" data-action="goto-duplicates"><span class="quick-ic">' + E.icon('copy', 18) + '</span><span><strong>Clean duplicates</strong><small>' + E.formatBytes(S.dupInfo.reclaimable) + ' to reclaim</small></span></button>' +
      '<button class="card quick-card" data-action="goto-rules"><span class="quick-ic">' + E.icon('sliders', 18) + '</span><span><strong>Edit rules</strong><small>' + S.rules.length + ' categories configured</small></span></button></div>';
  }

  /* -------------------------------------------------------------- organizer */
  function filteredPlan() {
    const q = S.filter.trim().toLowerCase();
    let rows = S.plan.filter((p) => {
      if (S.selectedOnly && !p.selected) return false;
      if (S.categoryFilter && p.category !== S.categoryFilter) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.rel.toLowerCase().includes(q) || p.ext.includes(q))) return false;
      return true;
    });
    const key = S.sort;
    rows.sort((a, b) => {
      if (key === 'size') return b.size - a.size;
      if (key === 'date') return b.mtime - a.mtime;
      if (key === 'category') return String(a.category).localeCompare(String(b.category));
      return a.name.localeCompare(b.name);
    });
    return rows;
  }
  function viewOrganizer() {
    const rows = filteredPlan();
    const shown = rows.slice(0, S.visibleRows);
    const sum = E.summarize(S.plan);
    const opts = S.settings;
    const catOptions = '<option value="">All categories</option>' + S.rules.map((r) => '<option value="' + r.id + '"' + (S.categoryFilter === r.id ? ' selected' : '') + '>' + E.esc(r.name) + '</option>').join('');

    const optionsPanel = S.showOptions ? '<div class="card options-panel"><div class="options-grid">' +
      '<div class="option-row"><span class="label">Recursive scanning</span><div class="toggle-row" style="padding:0">' + sw('recursive') + '<span class="hint">Include nested folders</span></div></div>' +
      '<div class="option-row"><span class="label">Max depth</span>' + inp('maxDepth', opts.maxDepth, 'number') + '</div>' +
      '<div class="option-row"><span class="label">Minimum size</span>' + inp('minSizeText', E.formatBytes(opts.minSize), 'text', 'e.g. 1 MB') + '</div>' +
      '<div class="option-row"><span class="label">Hash algorithm</span>' + sel('hashAlgorithm', [['sha256', 'SHA-256 (recommended)'], ['sha1', 'SHA-1 (faster)'], ['md5', 'MD5 (fastest)']], opts.hashAlgorithm) + '</div>' +
      '<div class="option-row"><span class="label">Conflict policy</span>' + sel('conflictPolicy', [['rename', 'Auto rename'], ['skip', 'Skip existing'], ['overwrite', 'Overwrite']], opts.conflictPolicy) + '</div>' +
      '<div class="option-row"><span class="label">Keep which duplicate</span>' + sel('keeperPolicy', [['newest', 'Newest'], ['oldest', 'Oldest'], ['shortest', 'Shortest path'], ['first', 'First alphabetically']], opts.keeperPolicy) + '</div>' +
      '<div class="option-row"><span class="label">Duplicate action</span>' + sel('duplicateAction', [['duplicates', 'Move to Duplicates'], ['trash', 'Send to Recycle Bin']], opts.duplicateAction) + '</div>' +
      '<div class="option-row"><span class="label">Exclude patterns</span><input class="input" data-setting="excludes" value="' + E.esc((opts.excludes || []).join(', ')) + '" placeholder="*.tmp, desktop.ini"></div>' +
      '<div class="option-row"><span class="label">Date subfolders</span><div class="toggle-row" style="padding:0">' + sw('dateGrouping') + '<span class="hint">Group by date</span></div></div>' +
      '<div class="option-row"><span class="label">Folder template</span>' + inp('dateTemplate', opts.dateTemplate, 'text', 'YYYY/MM') + '</div>' +
      '<div class="option-row"><span class="label">Preserve subfolders</span><div class="toggle-row" style="padding:0">' + sw('preserveStructure') + '<span class="hint">Keep nested layout</span></div></div>' +
      '<div class="option-row"><span class="label">Detect duplicates</span><div class="toggle-row" style="padding:0">' + sw('detectDuplicates') + '<span class="hint">Content hash</span></div></div>' +
      '<div class="option-row"><span class="label">Include hidden</span><div class="toggle-row" style="padding:0">' + sw('includeHidden') + '<span class="hint">Dot files</span></div></div>' +
      '<div class="option-row"><span class="label">Skip category folders</span><div class="toggle-row" style="padding:0">' + sw('skipCategoryFolders') + '<span class="hint">Already sorted</span></div></div>' +
      '<div class="option-row"><span class="label">Sorter animation</span><div class="toggle-row" style="padding:0">' + sw('animation') + '<span class="hint">Watch files move</span></div></div>' +
      '</div><div class="hint" style="margin-top:12px">Changes apply on the next scan. Files are never deleted by the organizer — duplicates go to a Duplicates folder or the Recycle Bin.</div></div>' : '';

    const toolbar = '<div class="card toolbar">' +
      '<div class="field search-field"><span class="ic" data-icon="search"></span><input class="input" data-filter placeholder="Search files, paths, extensions…" value="' + E.esc(S.filter) + '"></div>' +
      sel('categoryFilter', [], S.categoryFilter, 'data-filter-category style="width:170px"').replace('></select>', '>' + catOptions + '</select>') +
      '<select class="select" data-sort style="width:150px"><option value="name"' + (S.sort === 'name' ? ' selected' : '') + '>Sort: Name</option><option value="size"' + (S.sort === 'size' ? ' selected' : '') + '>Sort: Size</option><option value="date"' + (S.sort === 'date' ? ' selected' : '') + '>Sort: Date</option><option value="category"' + (S.sort === 'category' ? ' selected' : '') + '>Sort: Category</option></select>' +
      '<button class="btn btn-ghost btn-sm" data-action="toggle-selected">' + E.icon(S.selectedOnly ? 'checkCircle' : 'filter', 13) + '<span>' + (S.selectedOnly ? 'Selected only' : 'Show all') + '</span></button>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-ghost btn-sm" data-action="select-all">' + E.icon('check', 13) + '<span>Select all</span></button>' +
      '<button class="btn btn-ghost btn-sm" data-action="select-none">' + E.icon('x', 13) + '<span>Clear</span></button>' +
      '<button class="btn btn-soft btn-sm" data-action="toggle-options">' + E.icon('sliders', 13) + '<span>Options</span></button></div>';

    const summary = '<div class="plan-summary">' +
      '<span class="summary-pill">' + E.icon('list', 13) + '<strong>' + E.formatNumber(sum.total) + '</strong> files in plan</span>' +
      '<span class="summary-pill">' + E.icon('checkCircle', 13) + '<strong>' + E.formatNumber(sum.selected) + '</strong> selected · ' + E.formatBytes(sum.selectedSize) + '</span>' +
      '<span class="summary-pill">' + E.icon('copy', 13) + '<strong>' + E.formatNumber(S.dupInfo.groups.length) + '</strong> duplicate groups</span>' +
      '<span class="summary-pill">' + E.icon('folder', 13) + '<strong>' + E.formatNumber(sum.byCategory.size) + '</strong> destination folders</span>' +
      (S.scanning ? '<span class="summary-pill"><span class="spinner"></span> Scanning…</span>' : '') + '</div>';

    let table;
    if (!S.plan.length) {
      table = '<div class="card">' + (S.lastSummary ? empty('Sorting complete', S.lastSummary, 'checkCircle', 'Scan again', 'scan') : empty('No plan yet', 'Pick a folder and scan it. Review every proposed move before anything changes — nothing is touched during a scan.', 'folder', S.scanning ? 'Scanning…' : 'Scan folder', 'scan')) + '</div>';
    } else {
      const body = shown.map((p) => {
        const r = rule(p.category);
        const catSelect = '<select class="cat-select" data-cat-select="' + p.id + '">' + S.rules.map((x) => '<option value="' + x.id + '"' + (x.id === p.category ? ' selected' : '') + '>' + E.esc(x.name) + '</option>').join('') + '</select>';
        return '<tr class="' + (p.selected ? '' : 'muted-row') + '"><td><input type="checkbox" data-file-check="' + p.id + '"' + (p.selected ? ' checked' : '') + '></td>' +
          '<td><div class="file-cell"><div class="file-ic" style="background:' + r.color + '1c;color:' + r.color + '">' + E.icon(r.glyph || 'file', 15) + '</div><div><div class="file-name" title="' + E.esc(p.name) + '">' + E.esc(p.name) + '</div><div class="file-meta">' + E.esc(p.dir || 'root') + (p.dupGroup ? ' · duplicate copy' : '') + '</div></div></div></td>' +
          '<td class="mono">' + E.formatBytes(p.size) + '</td><td class="mono">' + E.formatDate(p.mtime) + '</td>' +
          '<td>' + catSelect + '</td><td class="mono" title="' + E.esc(p.dest) + '">' + E.esc(p.dest.length > 46 ? '…' + p.dest.slice(-44) : p.dest) + '</td>' +
          '<td>' + (p.dupGroup ? '<span class="copy-tag">DUPLICATE</span>' : p.override ? '<span class="keeper-tag">OVERRIDE</span>' : catBadge(p.category)) + '</td>' +
          '<td><div class="row-actions"><button class="icon-btn" data-action="preview-file" data-id="' + p.id + '" title="Preview">' + E.icon('eye', 14) + '</button><button class="icon-btn" data-action="reveal-file" data-id="' + p.id + '" title="Show in folder">' + E.icon('external', 14) + '</button></div></td></tr>';
      }).join('');
      table = '<div class="table-wrap"><table class="data-table"><thead><tr><th style="width:34px"><input type="checkbox" data-select-all' + (S.plan.every((p) => p.selected) ? ' checked' : '') + '></th><th>File</th><th>Size</th><th>Modified</th><th>Category</th><th>Destination</th><th>Status</th><th style="width:70px"></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        (rows.length > shown.length ? '<div style="text-align:center;margin-top:14px">' + btn('load-more', 'Show more (' + E.formatNumber(rows.length - shown.length) + ' remaining)', 'down', 'btn-ghost btn-sm') + '</div>' : '');
    }

    return '<div class="view-head"><div><h2 class="view-title">Organizer</h2><p class="view-sub">Preview, adjust and run a fully reversible organization plan.</p></div><div class="head-actions">' +
      btn('pick-folder', 'Choose folder', 'folderPlus', 'btn-soft') +
      btn('export-plan', 'Export plan', 'download', 'btn-ghost') +
      btn('scan', S.scanning ? 'Scanning…' : 'Re-scan', 'refresh', 'btn-soft') +
      btn('organize', 'Organize ' + E.formatNumber(sum.selected) + ' files', 'wand', 'btn-primary', S.plan.length && !S.organizing ? '' : 'disabled') + '</div></div>' +
      toolbar + optionsPanel + summary + table +
      '<div class="hint" style="margin-top:12px">Shortcuts: <span class="kbd">Ctrl+O</span> choose folder · <span class="kbd">Ctrl+F</span> search · <span class="kbd">Ctrl+Enter</span> organize · <span class="kbd">Ctrl+Z</span> undo last session</div>';
  }

  /* ------------------------------------------------------------- duplicates */
  function viewDuplicates() {
    const d = S.dupInfo;
    const groups = d.groups.map((g) => {
      const files = g.files.map((f) => {
        const isKeeper = f.id === g.keeper.id;
        return '<div class="dup-file"><span class="file-ic" style="background:' + rule('duplicates').color + '1c;color:' + rule('duplicates').color + '">' + E.icon(fileGlyph(f.originalCategory || 'others'), 14) + '</span>' +
          '<div style="flex:1;min-width:0"><div class="file-name" title="' + E.esc(f.path) + '">' + E.esc(f.name) + '</div><div class="file-meta">' + E.esc(f.dir || 'root') + ' · ' + E.formatDate(f.mtime) + '</div></div>' +
          '<span class="mono">' + E.formatBytes(f.size) + '</span>' +
          (isKeeper ? '<span class="keeper-tag">KEEPER</span>' : '<span class="copy-tag">COPY</span>') +
          '<button class="icon-btn" data-action="set-keeper" data-group="' + g.id + '" data-file="' + f.id + '" title="Make this the keeper">' + E.icon('check', 14) + '</button>' +
          '<button class="icon-btn" data-action="reveal-file" data-id="' + f.id + '" title="Show in folder">' + E.icon('external', 14) + '</button></div>';
      }).join('');
      return '<div class="dup-group"><div class="dup-head"><span class="file-ic" style="background:rgba(249,115,22,.14);color:#f97316">' + E.icon('copy', 16) + '</span>' +
        '<strong>' + g.files.length + ' identical files</strong><span class="mono">#' + E.esc(g.hash.slice(0, 12)) + '</span>' +
        '<span class="hint">' + E.formatBytes(g.size) + ' each</span><div class="spacer"></div>' +
        '<span class="badge" style="background:rgba(52,211,153,.12);color:#34d399">Reclaim ' + E.formatBytes(g.size * g.copies.length) + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-action="ignore-group" data-group="' + g.id + '">Ignore</button></div>' + files + '</div>';
    }).join('');

    return '<div class="view-head"><div><h2 class="view-title">Duplicates</h2><p class="view-sub">Content-verified groups. Choose the keeper, then reclaim space safely.</p></div><div class="head-actions">' +
      btn('scan', 'Re-scan hashes', 'refresh', 'btn-soft') +
      btn('organize-duplicates', 'Clean duplicates', 'wand', 'btn-primary', d.count ? '' : 'disabled') + '</div></div>' +
      '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('copy', 17) + '</div><div class="stat-value">' + E.formatNumber(d.count) + '</div><div class="stat-label">Duplicate copies</div></div>' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('drive', 17) + '</div><div class="stat-value">' + E.formatBytes(d.reclaimable) + '</div><div class="stat-label">Space to reclaim</div></div>' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('layers', 17) + '</div><div class="stat-value">' + E.formatNumber(d.groups.length) + '</div><div class="stat-label">Identical groups</div></div></div>' +
      '<div class="card toolbar" style="margin-bottom:16px"><span class="hint" style="flex:1">Files are grouped by exact size and ' + String(S.settings.hashAlgorithm).toUpperCase() + ' content hash. The keeper stays in place; copies are moved to <strong>' + E.esc(rule('duplicates').folder) + '</strong>' + (S.settings.duplicateAction === 'trash' ? ' or sent to the Recycle Bin' : '') + '.</span>' +
      sel('keeperPolicy', [['newest', 'Keep newest'], ['oldest', 'Keep oldest'], ['shortest', 'Keep shortest path'], ['first', 'Keep first A–Z']], S.settings.keeperPolicy, 'style="width:180px"') +
      sel('duplicateAction', [['duplicates', 'Move to Duplicates'], ['trash', 'Send to Recycle Bin']], S.settings.duplicateAction, 'style="width:190px"') + '</div>' +
      (groups || '<div class="card">' + empty('No duplicates found', 'Run a scan with duplicate detection enabled. Exact copies are grouped by size and content hash, never by name alone.', 'checkCircle', 'Scan folder', 'scan') + '</div>');
  }

  /* ------------------------------------------------------------------ rules */
  function viewRules() {
    const cards = E.sortedRules(S.rules).map((r, index) => {
      const m = r.match || {};
      const meta = [
        (m.ext || []).length ? (m.ext.length > 4 ? m.ext.slice(0, 4).join(', ') + ' +' + (m.ext.length - 4) : m.ext.join(', ')) : 'no extensions',
        m.regex ? 'name: /' + m.regex + '/' : 'name: any',
        m.minSize ? '≥ ' + E.formatBytes(m.minSize) : null,
        m.maxSize ? '≤ ' + E.formatBytes(m.maxSize) : null,
        m.maxAgeDays ? '≤ ' + m.maxAgeDays + ' days old' : null,
        '→ ' + r.folder
      ].filter(Boolean).map((t) => '<span>' + E.esc(t) + '</span>').join('');
      return '<div class="rule-card"><span class="rule-handle">' + E.icon('more', 16) + '</span>' +
        '<div class="rule-color" style="background:' + r.color + '1c;color:' + r.color + '">' + E.icon(r.glyph || 'file', 17) + '</div>' +
        '<div class="rule-main"><strong>' + E.esc(r.name) + (r.custom ? ' <span class="chip" style="font-size:8.5px;padding:2px 6px">CUSTOM</span>' : '') + '</strong><div class="rule-meta">' + meta + '</div></div>' +
        '<span class="prio-badge">P' + E.esc(r.priority) + '</span>' +
        '<div class="rule-actions"><div class="switch ' + (r.enabled ? 'on' : '') + '" data-action="toggle-rule" data-rule="' + r.id + '"></div>' +
        '<button class="icon-btn" data-action="rule-up" data-rule="' + r.id + '" title="Higher priority" style="transform:rotate(-90deg)">' + E.icon('chevron', 14) + '</button>' +
        '<button class="icon-btn" data-action="rule-down" data-rule="' + r.id + '" title="Lower priority">' + E.icon('down', 14) + '</button>' +
        btn('edit-rule', '', 'edit', 'btn-ghost btn-icon', 'data-rule="' + r.id + '"') +
        (r.custom ? '<button class="icon-btn" data-action="delete-rule" data-rule="' + r.id + '" title="Delete rule">' + E.icon('trash', 14) + '</button>' : '') + '</div></div>';
    }).join('');

    return '<div class="view-head"><div><h2 class="view-title">Rules</h2><p class="view-sub">Unlimited categories with extensions, name patterns, size and age conditions.</p></div><div class="head-actions">' +
      btn('import-rules', 'Import', 'upload', 'btn-ghost') + btn('export-rules', 'Export', 'download', 'btn-ghost') +
      btn('reset-rules', 'Reset defaults', 'refresh', 'btn-ghost') + btn('new-rule', 'New rule', 'plus', 'btn-primary') + '</div></div>' +
      '<div class="plan-summary"><span class="summary-pill">' + E.icon('sliders', 13) + '<strong>' + S.rules.length + '</strong> rules</span>' +
      '<span class="summary-pill">' + E.icon('checkCircle', 13) + '<strong>' + S.rules.filter((r) => r.enabled).length + '</strong> enabled</span>' +
      '<span class="summary-pill">' + E.icon('sparkles', 13) + '<strong>' + S.rules.filter((r) => r.custom).length + '</strong> custom</span>' +
      '<span class="summary-pill" style="margin-left:auto">First matching rule wins · drag priority with arrows</span></div>' +
      '<div class="card" style="padding:14px">' + cards + '</div><input type="file" id="rulesFile" accept=".json,application/json" hidden>';
  }

  /* ------------------------------------------------------------- automation */
  function viewAutomation() {
    const folders = S.settings.watchFolders.length ? S.settings.watchFolders.map((f, i) =>
      '<div class="watch-item"><div class="file-ic" style="background:var(--accent-soft);color:var(--accent)">' + E.icon('folder', 16) + '</div>' +
      '<div><strong>' + E.esc(f) + '</strong><small>Live watch · new files trigger a scan</small></div><div class="spacer"></div>' +
      '<span class="badge" style="background:rgba(52,211,153,.12);color:#34d399">Active</span>' +
      '<button class="icon-btn" data-action="remove-watch" data-index="' + i + '" title="Remove">' + E.icon('trash', 14) + '</button></div>').join('')
      : '<p class="hint">No folders watched yet. Add Downloads to auto-tidy it whenever a new file lands.</p>';
    const logs = S.logs.length ? S.logs.slice(0, 12).map((l) => '<div class="log-item"><time>' + E.esc(new Date(l.time).toLocaleTimeString('en-US', { hour12: false })) + '</time><p>' + E.esc(l.text) + '</p></div>').join('') : '<p class="hint">Watcher events appear here.</p>';

    return '<div class="view-head"><div><h2 class="view-title">Auto Organize</h2><p class="view-sub">Let the app tidy folders in the background — no manual clicks, no limits.</p></div><div class="head-actions">' +
      btn('add-watch', 'Add folder', 'folderPlus', 'btn-soft') +
      btn('toggle-watch', S.watchActive ? 'Stop watching' : 'Start watching', S.watchActive ? 'pause' : 'play', S.watchActive ? 'btn-danger' : 'btn-primary') + '</div></div>' +
      '<div class="panel-grid"><div class="panel">' + panelHead('Watched folders', 'Multiple folders supported — the original handled one at a time', 'eye') + folders +
      '<div class="divider"></div>' +
      settingRow('Auto-organize on change', 'Run a scan and sort automatically when a file appears', sw('autoOrganize')) +
      settingRow('Scheduled sweep', 'Periodic background tidy, even without file changes', sw('scheduleEnabled')) +
      settingRow('Sweep interval (minutes)', 'How often the scheduled sweep runs', inp('scheduleInterval', S.settings.scheduleInterval, 'number')) +
      '</div><div class="panel">' + panelHead('How automation works', 'Designed to stay predictable and reversible', 'bolt') +
      '<div class="unlock-list">' +
      '<div class="unlock-row"><span class="unlock-new">' + E.icon('eye', 14) + ' Native filesystem watcher</span><span class="unlock-old">No polling loops</span></div>' +
      '<div class="unlock-row"><span class="unlock-new">' + E.icon('clock', 14) + ' 2.5s debounce before sorting</span><span class="unlock-old">Waits for downloads to finish</span></div>' +
      '<div class="unlock-row"><span class="unlock-new">' + E.icon('undo', 14) + ' Every run is journaled</span><span class="unlock-old">Undo from History</span></div>' +
      '<div class="unlock-row"><span class="unlock-new">' + E.icon('shield', 14) + ' Runs fully offline</span><span class="unlock-old">No cloud, no account</span></div>' +
      '</div><div class="divider"></div><p class="hint">Tip: keep "Move to Duplicates" enabled for automation so no file is ever removed from disk automatically.</p></div></div>' +
      '<div class="panel">' + panelHead('Watcher log', 'Recent background events', 'list', btn('clear-logs', 'Clear', 'trash', 'btn-ghost btn-sm')) + '<div class="log-list">' + logs + '</div></div>';
  }

  /* ---------------------------------------------------------------- history */
  function viewHistory() {
    const items = S.sessions.length ? S.sessions.map((s) => '<div class="session-item"><div class="file-ic" style="background:var(--accent-soft);color:var(--accent)">' + E.icon('history', 16) + '</div>' +
      '<div><strong>' + E.esc(s.root || 'Folder session') + '</strong><small>' + E.esc(E.formatDate(new Date(s.createdAt).getTime(), true)) + ' · ' + E.esc(E.timeAgo(s.createdAt)) + '</small></div><div class="spacer"></div>' +
      '<div class="session-stats"><span><b>' + E.formatNumber((s.stats && s.stats.moved) || 0) + '</b> moved</span><span><b>' + E.formatNumber((s.stats && s.stats.skipped) || 0) + '</b> skipped</span><span><b>' + E.formatNumber((s.stats && s.stats.failed) || 0) + '</b> failed</span></div>' +
      (s.undone ? '<span class="badge" style="background:rgba(52,211,153,.12);color:#34d399">Restored</span>' : btn('undo-session', 'Undo', 'undo', 'btn-soft btn-sm', 'data-session="' + s.id + '"')) +
      '<button class="icon-btn" data-action="session-detail" data-session="' + s.id + '" title="Details">' + E.icon('eye', 14) + '</button></div>').join('')
      : '<p class="hint">No sessions yet. Organize a folder and the full journal appears here.</p>';

    return '<div class="view-head"><div><h2 class="view-title">History</h2><p class="view-sub">Every move is journaled. Restore an entire session with one click.</p></div><div class="head-actions">' +
      btn('export-session', 'Export report', 'download', 'btn-ghost') + btn('refresh-sessions', 'Refresh', 'refresh', 'btn-soft') + '</div></div>' +
      '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('history', 17) + '</div><div class="stat-value">' + E.formatNumber(S.sessions.length) + '</div><div class="stat-label">Sessions recorded</div></div>' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('arrow', 17) + '</div><div class="stat-value">' + E.formatNumber(S.sessions.reduce((n, s) => n + ((s.stats && s.stats.moved) || 0), 0)) + '</div><div class="stat-label">Files moved</div></div>' +
      '<div class="card stat-card"><div class="stat-ic">' + E.icon('undo', 17) + '</div><div class="stat-value">' + E.formatNumber(S.sessions.filter((s) => !s.undone).length) + '</div><div class="stat-label">Reversible sessions</div></div></div>' +
      '<div class="panel">' + panelHead('Session journal', 'Stored locally in your app data folder', 'history') + items + '</div>';
  }

  /* --------------------------------------------------------------- settings */
  function viewSettings() {
    const o = S.settings;
    const accents = [['violet', '#a78bfa'], ['ocean', '#38bdf8'], ['ember', '#fb923c'], ['mint', '#34d399']].map(([k, c]) =>
      '<button class="swatch ' + (o.accent === k ? 'active' : '') + '" data-action="set-accent" data-accent="' + k + '" style="background:linear-gradient(135deg,' + c + ',#22d3ee)" title="' + k + '"></button>').join('');
    return '<div class="view-head"><div><h2 class="view-title">Settings</h2><p class="view-sub">Your preferences stay on this machine. Nothing is synced or uploaded.</p></div><div class="head-actions">' +
      btn('export-settings', 'Export config', 'download', 'btn-ghost') + btn('reset-data', 'Reset all', 'trash', 'btn-danger') + '</div></div>' +
      '<div class="settings-grid">' +
      '<div class="panel"><div class="setting-section"><h3>Appearance</h3>' +
      settingRow('Theme', 'Switch between dark and light surfaces', sel('theme', [['dark', 'Dark'], ['light', 'Light']], o.theme)) +
      settingRow('Accent color', 'Personalize the whole interface', '<div class="accent-swatches">' + accents + '</div>') +
      settingRow('Sorter animation', 'Animated view while files move', sw('animation')) +
      settingRow('Show sorter window', 'Display the live organizer stage', sw('showSorter')) +
      settingRow('Animation speed (ms)', 'Delay between moves (0 = fastest)', inp('animationSpeed', o.animationSpeed, 'number')) +
      '</div><div class="setting-section"><h3>Folders & scale</h3>' +
      settingRow('Default folder', 'Opened automatically on launch', '<div style="display:flex;gap:6px">' + inp('defaultFolder', o.defaultFolder || S.info.downloads || '', 'text') + '</div>') +
      settingRow('Max files per scan', 'Safety cap for very large folders', inp('maxFiles', o.maxFiles, 'number')) +
      settingRow('Skip category folders', 'Ignore already organized subfolders', sw('skipCategoryFolders')) +
      settingRow('Include hidden files', 'Include dot-prefixed files', sw('includeHidden')) +
      '</div></div>' +
      '<div class="panel"><div class="setting-section"><h3>Organization</h3>' +
      settingRow('Conflict policy', 'What happens if destination exists', sel('conflictPolicy', [['rename', 'Auto rename'], ['skip', 'Skip'], ['overwrite', 'Overwrite']], o.conflictPolicy)) +
      settingRow('Hash algorithm', 'Used for exact duplicate detection', sel('hashAlgorithm', [['sha256', 'SHA-256'], ['sha1', 'SHA-1'], ['md5', 'MD5']], o.hashAlgorithm)) +
      settingRow('Keeper policy', 'Which copy stays in place', sel('keeperPolicy', [['newest', 'Newest'], ['oldest', 'Oldest'], ['shortest', 'Shortest path'], ['first', 'First A–Z']], o.keeperPolicy)) +
      settingRow('Duplicate action', 'Where extra copies go', sel('duplicateAction', [['duplicates', 'Duplicates folder'], ['trash', 'Recycle Bin']], o.duplicateAction)) +
      settingRow('Date subfolders', 'Sort into YYYY/MM style folders', sw('dateGrouping')) +
      settingRow('Folder template', 'Tokens: YYYY, YY, MMM, MM, DD, HH', inp('dateTemplate', o.dateTemplate, 'text')) +
      settingRow('Preserve subfolders', 'Keep relative paths inside categories', sw('preserveStructure')) +
      '</div><div class="setting-section"><h3>Privacy</h3>' +
      '<div class="setting-row"><div class="setting-info"><strong>100% offline engine</strong><small>No account, no cloud upload, no telemetry, no update pings. File contents never leave this device.</small></div><div class="setting-control"><span class="badge" style="background:rgba(52,211,153,.12);color:#34d399">Always on</span></div></div>' +
      '<div class="setting-row"><div class="setting-info"><strong>Local data path</strong><small>' + E.esc(S.info.userData || 'app data folder') + '</small></div></div>' +
      '</div></div></div>';
  }

  /* ------------------------------------------------------------------ about */
  function viewAbout() {
    const comparison = E.UNLOCKED.map(([a, b]) => '<div class="unlock-row" style="grid-template-columns:1fr 20px 1.2fr"><span class="unlock-old">' + E.esc(a) + '</span>' + E.icon('arrow', 12) + '<span class="unlock-new">' + E.esc(b) + '</span></div>').join('');
    return '<div class="view-head"><div><h2 class="view-title">About & Credits</h2><p class="view-sub">A complete redesign of the small Downloads tidy-up tool — rebuilt without limits.</p></div></div>' +
      '<div class="panel about-hero"><div class="about-logo">' + E.icon('folder', 32) + '</div>' +
      '<h2>MeetOrganizer <span class="pro-badge" style="vertical-align:4px">PRO</span></h2>' +
      '<p>An unlimited, local-first desktop organizer. Deep recursive scans, content-verified duplicate cleanup, a customizable rules engine, live folder watching, scheduled sweeps, rich previews and one-click full session undo.</p>' +
      '<div class="feature-chips">' + ['No account', 'No cloud', 'No file caps', 'No paywall', 'No telemetry', '18 categories', 'Unlimited rules', 'Full undo', 'Cross-platform', 'Open source you own'].map((t) => '<span class="chip">' + E.esc(t) + '</span>').join('') + '</div></div>' +
      '<div class="panel-grid" style="margin-top:16px"><div class="panel">' + panelHead('Original vs this edition', 'Every restriction removed', 'bolt') + '<div class="unlock-list">' + comparison + '</div></div>' +
      '<div class="panel">' + panelHead('System information', 'Runtime details', 'info') +
      settingRow('Version', 'MeetOrganizer Pro', '<span class="mono">v' + E.esc(S.info.version || '2.0.0') + '</span>') +
      settingRow('Platform', 'Operating system', '<span class="mono">' + E.esc(S.info.platform || '—') + ' / ' + E.esc(S.info.arch || '—') + '</span>') +
      settingRow('Runtime', 'Electron / Node', '<span class="mono">' + E.esc(S.info.electron || 'preview') + ' / ' + E.esc(S.info.node || '—') + '</span>') +
      settingRow('Engine', 'Where files are processed', '<span class="badge" style="background:rgba(52,211,153,.12);color:#34d399">Local only</span>') +
      '</div></div>' +
      '<div class="credit-block"><div class="eyebrow">Credits</div><h3>Design and Developed by Mr.Busy</h3>' +
      '<p>Interface design, product architecture and full-stack implementation of this unlimited edition.</p>' +
      '<a class="credit-link" href="https://ai-1.art/" data-action="about-link">' + E.icon('globe', 16) + ' AI Art — https://ai-1.art/ ' + E.icon('external', 14) + '</a>' +
      '<div class="gh-about-links">' +
        '<a class="credit-link" href="https://github.com/mrbusy1/MeetOrganizer" data-action="github-repo">' + E.icon('github', 15) + ' github.com/mrbusy1/MeetOrganizer ' + E.icon('external', 13) + '</a>' +
        '<a class="credit-link" href="https://github.com/mrbusy1" data-action="github-profile">' + E.icon('link', 15) + ' mrbusy1 on GitHub ' + E.icon('external', 13) + '</a>' +
      '</div>' +
      '<div class="gh-about-actions">' + btn('github-star', S.githubStarred ? 'Starred' : 'Give a star', 'star', 'btn-soft') + btn('github-share', 'Share repo', 'share', 'btn-ghost') + btn('github-releases', 'Releases', 'download', 'btn-ghost') + '</div>' +
      '<div class="feature-chips"><span class="chip">AI Art · AI Tool Directory</span><span class="chip">GitHub · mrbusy1</span><span class="chip">© 2026</span></div></div>';
  }

  /* ----------------------------------------------------------------- modals */
  function openModal(html, wide) {
    $('#modalRoot').innerHTML = '<div class="modal-backdrop" data-backdrop="1"><div class="modal ' + (wide ? 'wide' : '') + '">' + html + '</div></div>';
    hydrateIcons($('#modalRoot'));
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }
  function modalHead(title, sub) {
    return '<div class="modal-head"><div><h3>' + E.esc(title) + '</h3>' + (sub ? '<p>' + E.esc(sub) + '</p>' : '') + '</div><button class="icon-btn" data-action="modal-close">' + E.icon('x', 17) + '</button></div>';
  }

  function openRuleModal(id) {
    const r = id ? S.rules.find((x) => x.id === id) : null;
    const data = r ? clone(r) : { id: E.uid('rule'), name: '', folder: '', color: '#a78bfa', glyph: 'folder', enabled: true, priority: 5, custom: true, match: { ext: [], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } };
    const colors = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#22d3ee', '#94a3b8'];
    const glyphs = ['folder', 'image', 'video', 'music', 'file', 'archive', 'code', 'palette', 'chart', 'download', 'drive', 'tag'];
    const html = modalHead(r ? 'Edit rule' : 'Create a custom rule', 'First matching rule wins. Priority 1 is checked before priority 99.') +
      '<div class="modal-body"><div class="form-grid" data-rule-form data-rule-id="' + (r ? r.id : '') + '">' +
      '<div class="field"><label class="label">Rule name</label><input class="input" id="rfName" value="' + E.esc(data.name) + '" placeholder="e.g. Client Invoices"></div>' +
      '<div class="field"><label class="label">Destination folder</label><input class="input" id="rfFolder" value="' + E.esc(data.folder) + '" placeholder="e.g. Invoices"></div>' +
      '<div class="field"><label class="label">Extensions (comma separated)</label><input class="input" id="rfExt" value="' + E.esc((data.match.ext || []).join(', ')) + '" placeholder="pdf, docx"></div>' +
      '<div class="field"><label class="label">Filename regex (optional)</label><input class="input" id="rfRegex" value="' + E.esc(data.match.regex || '') + '" placeholder="invoice|receipt"></div>' +
      '<div class="field"><label class="label">Priority</label><input class="input" id="rfPriority" type="number" min="1" max="99" value="' + E.esc(data.priority) + '"></div>' +
      '<div class="field"><label class="label">Icon</label><select class="select" id="rfGlyph">' + glyphs.map((g) => '<option value="' + g + '"' + (g === data.glyph ? ' selected' : '') + '>' + g + '</option>').join('') + '</select></div>' +
      '<div class="field"><label class="label">Minimum size (bytes)</label><input class="input" id="rfMin" type="number" value="' + E.esc(data.match.minSize || 0) + '"></div>' +
      '<div class="field"><label class="label">Maximum size (bytes, 0 = any)</label><input class="input" id="rfMax" type="number" value="' + E.esc(data.match.maxSize || 0) + '"></div>' +
      '<div class="field"><label class="label">Max age in days (0 = any)</label><input class="input" id="rfAge" type="number" value="' + E.esc(data.match.maxAgeDays || 0) + '"></div>' +
      '<div class="field"><label class="label">Color</label><select class="select" id="rfColor">' + colors.map((c) => '<option value="' + c + '"' + (c === data.color ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
      '</div><p class="hint" style="margin-top:14px">A rule matches when its extension or filename regex matches, and all size / age conditions are satisfied.</p></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Cancel</button><button class="btn btn-primary" data-action="save-rule">' + E.icon('check', 15) + '<span>Save rule</span></button></div>';
    openModal(html);
  }

  async function previewFile(id) {
    const f = S.plan.find((x) => x.id === id) || S.files.find((x) => x.id === id);
    if (!f) return;
    const result = await MO.preview(f.path);
    let body;
    if (result && result.type === 'image') body = '<img src="' + result.dataUrl + '" style="max-width:100%;max-height:340px;border-radius:10px;display:block;margin:auto">';
    else if (result && result.type === 'text') body = '<pre class="mono" style="white-space:pre-wrap;background:var(--panel-2);padding:14px;border-radius:10px;max-height:340px;overflow:auto">' + E.esc(result.text) + '</pre>';
    else body = '<div class="empty-state" style="padding:26px"><div class="empty-ic">' + E.icon('file', 24) + '</div><h3>No inline preview</h3><p>This file type can be opened with its default application instead.</p></div>';
    openModal(modalHead(f.name, E.formatBytes(f.size) + ' · ' + f.path) + '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Close</button><button class="btn btn-primary" data-action="reveal-file" data-id="' + f.id + '">' + E.icon('external', 15) + '<span>Open in system</span></button></div>');
  }

  function sessionDetail(id) {
    const s = S.sessions.find((x) => x.id === id);
    if (!s) return;
    const rows = (s.moves || []).slice(0, 60).map((m) => '<div class="dup-file"><span class="file-ic" style="background:var(--accent-soft);color:var(--accent)">' + E.icon('file', 13) + '</span><div style="flex:1;min-width:0"><div class="file-name">' + E.esc(m.name || m.src) + '</div><div class="file-meta">' + E.esc(m.category || '') + '</div></div></div>').join('') || '<p class="hint">No individual moves recorded in this session.</p>';
    const html = modalHead('Session details', E.formatDate(new Date(s.createdAt).getTime(), true)) +
      '<div class="modal-body"><div class="plan-summary"><span class="summary-pill"><strong>' + E.formatNumber(s.stats.moved) + '</strong> moved</span><span class="summary-pill"><strong>' + E.formatNumber(s.stats.skipped) + '</strong> skipped</span><span class="summary-pill"><strong>' + E.formatNumber(s.stats.trashed || 0) + '</strong> trashed</span><span class="summary-pill"><strong>' + E.formatNumber(s.stats.failed) + '</strong> failed</span></div>' +
      '<p class="hint">Root: ' + E.esc(s.root) + '</p><div class="divider"></div>' + rows + '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Close</button>' + (s.undone ? '' : '<button class="btn btn-primary" data-action="undo-session" data-session="' + s.id + '">' + E.icon('undo', 15) + '<span>Restore files</span></button>') + '</div>';
    openModal(html, true);
  }

  /* --------------------------------------------------------------- actions */
  async function pickFolder() {
    const folder = await MO.pickFolder();
    if (!folder) return;
    S.root = folder;
    S.settings.defaultFolder = folder;
    persist();
    render();
    toast('Target folder set');
    runScan(false);
  }

  async function runScan(silent) {
    if (S.scanning || !S.root) { if (!S.root) pickFolder(); return; }
    S.scanning = true; S.visibleRows = 150;
    render();
    try {
      const files = await MO.scan({
        root: S.root,
        recursive: S.settings.recursive,
        maxDepth: S.settings.maxDepth,
        includeHidden: S.settings.includeHidden,
        minSize: S.settings.minSize,
        maxFiles: S.settings.maxFiles,
        excludes: S.settings.excludes,
        skipCategoryFolders: S.settings.skipCategoryFolders,
        categoryFolders: E.categoryFolders(S.rules)
      });
      S.files = files;
      let dup = { groups: [], extras: new Map(), reclaimable: 0, count: 0 };
      if (S.settings.detectDuplicates && files.length) {
        const bySize = new Map();
        for (const f of files) { if (!bySize.has(f.size)) bySize.set(f.size, []); bySize.get(f.size).push(f); }
        const candidates = [];
        for (const list of bySize.values()) if (list.length > 1) for (const f of list) candidates.push(f.path);
        if (candidates.length) {
          const hashes = await MO.hash(candidates, S.settings.hashAlgorithm);
          dup = E.groupDuplicates(files, hashes, S.settings.keeperPolicy);
        }
      }
      S.dupInfo = dup;
      S.plan = E.buildPlan(files, S.rules, S.settings, S.root, dup);
      S.lastSummary = null;
      if (!silent) { toast('Scanned ' + E.formatNumber(files.length) + ' files · ' + dup.count + ' duplicates'); addActivity('Scanned ' + E.formatNumber(files.length) + ' files in ' + S.root, 'search'); }
    } catch (err) {
      toast(err.message || 'Scan failed', 'error');
    } finally {
      S.scanning = false;
      render();
    }
  }

  function recomputePlanFromDuplicates() {
    const extras = new Map();
    for (const g of S.dupInfo.groups) for (const c of g.copies) extras.set(c.id, g.id);
    S.dupInfo.extras = extras;
    S.dupInfo.count = extras.size;
    S.dupInfo.reclaimable = S.dupInfo.groups.reduce((n, g) => n + g.size * g.copies.length, 0);
    for (const p of S.plan) {
      const isDup = extras.has(p.id);
      if (isDup && !p.override) p.category = 'duplicates';
      else if (!isDup && !p.override && p.category === 'duplicates') p.category = p.originalCategory || E.classify(p, S.rules);
      p.dupGroup = isDup ? extras.get(p.id) : null;
      p.dest = E.destinationFor(p, S.rules, S.settings, S.root);
    }
  }

  function applyKeeperPolicy() {
    const policy = S.settings.keeperPolicy;
    for (const g of S.dupInfo.groups) {
      const sorted = g.files.slice().sort((a, b) => {
        if (policy === 'oldest') return a.mtime - b.mtime;
        if (policy === 'shortest') return a.path.length - b.path.length;
        if (policy === 'first') return a.name.localeCompare(b.name);
        return b.mtime - a.mtime;
      });
      g.files = sorted; g.keeper = sorted[0]; g.copies = sorted.slice(1);
    }
    recomputePlanFromDuplicates();
  }

  function setKeeper(groupId, fileId) {
    const g = S.dupInfo.groups.find((x) => x.id === groupId);
    if (!g) return;
    const chosen = g.files.find((f) => f.id === fileId);
    if (!chosen) return;
    g.keeper = chosen;
    g.copies = g.files.filter((f) => f.id !== fileId);
    recomputePlanFromDuplicates();
    render();
    toast('Keeper updated');
  }

  function ignoreGroup(groupId) {
    S.dupInfo.groups = S.dupInfo.groups.filter((g) => g.id !== groupId);
    recomputePlanFromDuplicates();
    render();
  }

  /* ---------------------------------------------------------- organize flow */
  function openSorter(total, categories) {
    S.sorterFinished = false;
    const buckets = categories.slice(0, 7).map((c) => '<div class="bucket" data-bucket="' + c.id + '">' + E.icon(c.glyph || 'folder', 15) + '<b>' + E.esc(c.name) + '</b><small data-count="' + c.id + '">0</small></div>').join('');
    const html = modalHead('Sorter is working', 'Watch your files move into place — pause or cancel at any time.') +
      '<div class="modal-body"><div class="sorter-stage"><div class="sorter-lane">' + E.icon('file', 16) + '<span id="sorterCurrent">Preparing files…</span></div>' +
      '<div class="fly-dot"></div><div class="fly-dot d2"></div><div class="fly-dot d3"></div><div class="bucket-grid">' + buckets + '</div></div>' +
      '<div class="progress"><div class="progress-fill" id="sorterFill" style="width:0%"></div></div>' +
      '<div class="sorter-stats"><span><strong id="sorterCount">0</strong> / <span id="sorterTotal">' + E.formatNumber(total) + '</span> files</span><span id="sorterStatus">Organizing…</span></div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="sorter-pause" id="sorterPause">' + E.icon('pause', 15) + '<span>Pause</span></button>' +
      '<button class="btn btn-danger" data-action="sorter-cancel">' + E.icon('x', 15) + '<span>Cancel</span></button>' +
      '<button class="btn btn-primary" data-action="sorter-close" id="sorterClose" disabled>' + E.icon('check', 15) + '<span>Done</span></button></div>';
    openModal(html, true);
    const modal = $('#modalRoot .modal');
    if (modal) modal.classList.add('sorter-modal');
  }
  function updateSorter(p) {
    if (!p) return;
    const fill = $('#sorterFill'), count = $('#sorterCount'), current = $('#sorterCurrent');
    if (fill) fill.style.width = (p.total ? (p.index / p.total * 100).toFixed(1) : 0) + '%';
    if (count) count.textContent = E.formatNumber(p.index);
    if (current && p.item) current.textContent = (p.item.name || '') + (p.status === 'skipped' ? ' · skipped' : '');
    const bucket = p.item && $('[data-bucket="' + p.item.category + '"]');
    if (bucket) {
      bucket.classList.add('hit');
      const counter = bucket.querySelector('[data-count]');
      if (counter) counter.textContent = String(Number(counter.textContent) + 1);
      setTimeout(() => bucket.classList.remove('hit'), 220);
    }
  }
  function finishOrganize(session) {
    if (!session || S.sorterFinished) return;
    S.sorterFinished = true;
    S.organizing = false;
    const status = $('#sorterStatus'), current = $('#sorterCurrent'), close = $('#sorterClose'), pause = $('#sorterPause');
    if (status) status.textContent = 'Complete';
    if (current) current.textContent = 'Everything is in place.';
    if (close) close.disabled = false;
    if (pause) pause.disabled = true;
    S.lastSummary = E.formatNumber(session.stats.moved) + ' files organized' + (session.stats.trashed ? ' · ' + session.stats.trashed + ' sent to Recycle Bin' : '') + '. You can restore this session from History.';
    S.plan = []; S.files = [];
    S.dupInfo = { groups: [], extras: new Map(), reclaimable: 0, count: 0 };
    addActivity('Organized ' + E.formatNumber(session.stats.moved) + ' files in ' + (session.root || 'folder'), 'wand');
    refreshSessions().then(() => { if (S.view === 'history') render(); });
    toast('Organized ' + E.formatNumber(session.stats.moved) + ' files — undo available in History');
  }

  async function doOrganize(onlyDuplicates, auto) {
    if (S.organizing || S.scanning) return;
    let selected = S.plan.filter((p) => p.selected && (!onlyDuplicates || p.category === 'duplicates'));
    if (!selected.length) { toast('No files selected', 'error'); return; }
    if (onlyDuplicates && !auto && !confirm('Move ' + selected.length + ' duplicate copies to ' + (S.settings.duplicateAction === 'trash' ? 'the Recycle Bin' : rule('duplicates').folder) + '?')) return;
    const trashPaths = S.settings.duplicateAction === 'trash' ? selected.filter((p) => p.category === 'duplicates').map((p) => p.path) : [];
    const moves = selected.filter((p) => !(trashPaths.length && p.category === 'duplicates')).map((p) => ({ src: p.path, dest: p.dest, name: p.name, category: p.category }));
    if (!moves.length && !trashPaths.length) { toast('Nothing to move', 'error'); return; }
    S.organizing = true;
    const categories = [];
    for (const m of moves) if (!categories.some((c) => c.id === m.category)) categories.push(rule(m.category));
    if (trashPaths.length) categories.push({ id: 'duplicates', name: 'Recycle Bin', glyph: 'trash' });
    if (S.settings.showSorter) openSorter(moves.length + trashPaths.length, categories.length ? categories : [{ id: 'others', name: 'Other', glyph: 'folder' }]);
    try {
      const session = await MO.organize(moves, {
        root: S.root,
        conflictPolicy: S.settings.conflictPolicy,
        delay: S.settings.animation ? Math.min(300, Number(S.settings.animationSpeed) || 0) : 0,
        trashPaths
      });
      finishOrganize(session);
      if (!S.settings.showSorter) render();
    } catch (err) {
      S.organizing = false;
      toast(err.message || 'Organize failed', 'error');
      closeModal();
      render();
    }
  }

  async function undoSession(id) {
    try {
      const res = await MO.undo(id);
      toast('Restored ' + E.formatNumber(res.restored) + ' files' + (res.trashed ? ' · trashed items need manual recovery from Recycle Bin' : ''));
      addActivity('Restored ' + E.formatNumber(res.restored) + ' files from a session', 'undo');
      closeModal();
      await refreshSessions();
      render();
    } catch (err) { toast(err.message || 'Undo failed', 'error'); }
  }

  async function exportPlan() {
    if (!S.plan.length) { toast('Scan a folder first', 'error'); return; }
    const rows = [['Name', 'Path', 'Size (bytes)', 'Modified', 'Category', 'Destination', 'Selected', 'Duplicate']].concat(
      S.plan.map((p) => [p.name, p.path, p.size, new Date(p.mtime).toISOString(), rule(p.category).name, p.dest, p.selected ? 'yes' : 'no', p.dupGroup ? 'yes' : 'no']));
    await MO.exportReport(E.toCSV(rows), 'meetorganizer-plan.csv');
    toast('Plan exported');
  }
  async function exportSessionReport() {
    const s = S.sessions[0];
    if (!s) { toast('No sessions yet', 'error'); return; }
    const rows = [['Session', 'Date', 'Root', 'Moved', 'Skipped', 'Failed', 'Trashed', 'Restored']].concat(S.sessions.map((x) => [x.id, x.createdAt, x.root, x.stats.moved, x.stats.skipped, x.stats.failed, x.stats.trashed || 0, x.undone ? 'yes' : 'no']));
    await MO.exportReport(E.toCSV(rows), 'meetorganizer-history.csv');
    toast('History exported');
  }

  /* ------------------------------------------------------------- watch/sched */
  function startWatch() {
    if (!S.settings.watchFolders.length) { toast('Add a folder to watch first', 'error'); return; }
    MO.watchStart(S.settings.watchFolders).then((n) => {
      S.watchActive = n > 0;
      addLog('Watcher started on ' + n + ' folder(s)');
      toast('Watching ' + n + ' folder(s)');
      render();
    });
  }
  function stopWatch() {
    MO.watchStop(); S.watchActive = false; addLog('Watcher stopped'); render();
  }
  function setupScheduler() {
    if (S.scheduler) { clearInterval(S.scheduler); S.scheduler = null; }
    if (!S.settings.scheduleEnabled) return;
    const minutes = Math.max(1, Number(S.settings.scheduleInterval) || 60);
    S.scheduler = setInterval(() => {
      if (S.organizing || S.scanning || !S.root) return;
      addLog('Scheduled sweep started');
      runScan(true).then(() => { if (S.plan.length) doOrganize(false, true); });
    }, minutes * 60000);
  }

  /* -------------------------------------------------------------- handlers */
  function onClick(e) {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) { S.view = viewBtn.dataset.view; render(); return; }
    const winBtn = e.target.closest('[data-win]');
    if (winBtn) { MO.win(winBtn.dataset.win); return; }
    if (e.target.dataset && e.target.dataset.backdrop) { closeModal(); return; }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const id = el.dataset.id, ruleId = el.dataset.rule, groupId = el.dataset.group;
    e.preventDefault();

    switch (a) {
      case 'quick-pick': case 'pick-folder': pickFolder(); break;
      case 'scan': runScan(false); break;
      case 'scan-downloads': S.root = S.info.downloads || S.root; S.settings.defaultFolder = S.root; persist(); runScan(false); break;
      case 'organize': doOrganize(false); break;
      case 'organize-duplicates': doOrganize(true); break;
      case 'export-plan': exportPlan(); break;
      case 'export-session': exportSessionReport(); break;
      case 'toggle-options': S.showOptions = !S.showOptions; render(); break;
      case 'toggle-selected': S.selectedOnly = !S.selectedOnly; render(); break;
      case 'select-all': S.plan.forEach((p) => { p.selected = true; }); render(); break;
      case 'select-none': S.plan.forEach((p) => { p.selected = false; }); render(); break;
      case 'load-more': S.visibleRows += 150; render(); break;
      case 'preview-file': previewFile(id); break;
      case 'reveal-file': {
        const f = S.plan.find((x) => x.id === id) || S.files.find((x) => x.id === id);
        if (f) MO.reveal(f.path);
        break;
      }
      case 'theme-toggle': S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; applyTheme(); persist(); render(); break;
      case 'set-accent': S.settings.accent = el.dataset.accent; applyTheme(); persist(); render(); break;
      case 'goto-history': S.view = 'history'; render(); break;
      case 'goto-organizer': S.view = 'organizer'; render(); break;
      case 'goto-duplicates': S.view = 'duplicates'; render(); break;
      case 'goto-rules': S.view = 'rules'; render(); break;
      case 'set-keeper': setKeeper(groupId, el.dataset.file); break;
      case 'ignore-group': ignoreGroup(groupId); break;
      case 'new-rule': openRuleModal(null); break;
      case 'edit-rule': openRuleModal(ruleId); break;
      case 'toggle-rule': {
        const r = S.rules.find((x) => x.id === ruleId);
        if (r) { r.enabled = !r.enabled; persist(); render(); }
        break;
      }
      case 'delete-rule': {
        if (confirm('Delete this rule?')) { S.rules = S.rules.filter((x) => x.id !== ruleId); persist(); render(); }
        break;
      }
      case 'rule-up': case 'rule-down': {
        const r = S.rules.find((x) => x.id === ruleId);
        if (!r) break;
        const ordered = E.sortedRules(S.rules);
        const i = ordered.findIndex((x) => x.id === ruleId);
        const j = a === 'rule-up' ? i - 1 : i + 1;
        if (j < 0 || j >= ordered.length) break;
        const tmp = r.priority; r.priority = ordered[j].priority; ordered[j].priority = tmp;
        persist(); render();
        break;
      }
      case 'save-rule': {
        const form = $('[data-rule-form]');
        const name = $('#rfName').value.trim(), folder = $('#rfFolder').value.trim();
        if (!name || !folder) { toast('Name and folder are required', 'error'); return; }
        const rid = form.dataset.ruleId;
        const existing = rid ? S.rules.find((x) => x.id === rid) : null;
        const data = {
          id: rid || E.uid('rule'), name, folder,
          color: $('#rfColor').value, glyph: $('#rfGlyph').value,
          enabled: existing ? existing.enabled : true,
          priority: Number($('#rfPriority').value) || 50,
          custom: existing ? existing.custom : true,
          match: {
            ext: $('#rfExt').value.split(',').map((s) => s.trim().replace(/^\./, '').toLowerCase()).filter(Boolean),
            regex: $('#rfRegex').value.trim(),
            minSize: Number($('#rfMin').value) || 0,
            maxSize: Number($('#rfMax').value) || 0,
            maxAgeDays: Number($('#rfAge').value) || 0
          }
        };
        if (existing) Object.assign(existing, data); else S.rules.push(data);
        persist(); closeModal(); render(); toast('Rule saved');
        break;
      }
      case 'reset-rules': {
        if (confirm('Restore the 18 default categories? Custom rules will be removed.')) {
          S.rules = clone(E.DEFAULT_RULES); persist(); render(); toast('Default rules restored');
        }
        break;
      }
      case 'export-rules': MO.exportReport(JSON.stringify(S.rules, null, 2), 'meetorganizer-rules.json'); toast('Rules exported'); break;
      case 'import-rules': { const input = $('#rulesFile'); if (input) input.click(); break; }
      case 'add-watch': {
        MO.pickFolder().then((f) => { if (f && !S.settings.watchFolders.includes(f)) { S.settings.watchFolders.push(f); persist(); if (S.watchActive) startWatch(); render(); } });
        break;
      }
      case 'remove-watch': S.settings.watchFolders.splice(Number(el.dataset.index), 1); persist(); if (S.watchActive) startWatch(); render(); break;
      case 'toggle-watch': S.watchActive ? stopWatch() : startWatch(); break;
      case 'clear-logs': S.logs = []; render(); break;
      case 'undo-session': undoSession(el.dataset.session); break;
      case 'session-detail': sessionDetail(el.dataset.session); break;
      case 'refresh-sessions': refreshSessions().then(() => { render(); toast('History refreshed'); }); break;
      case 'export-settings': MO.exportReport(JSON.stringify({ settings: S.settings, rules: S.rules }, null, 2), 'meetorganizer-config.json'); toast('Configuration exported'); break;
      case 'reset-data': {
        if (confirm('Reset settings, rules and activity to defaults? Session journals are kept.')) {
          S.settings = Object.assign({}, E.DEFAULT_SETTINGS); S.rules = clone(E.DEFAULT_RULES); S.activity = [];
          S.root = S.info.downloads || ''; persist(); applyTheme(); render(); toast('Reset complete');
        }
        break;
      }
      case 'about-link': MO.openExternal('https://ai-1.art/'); break;
      case 'github-repo': MO.openExternal(GH.repo); break;
      case 'github-profile': MO.openExternal(GH.profile); break;
      case 'github-releases': MO.openExternal(GH.releases); break;
      case 'github-star': {
        S.githubStarred = true;
        MO.set('githubStar', true);
        updateGithubCard();
        MO.openExternal(GH.repo);
        toast('GitHub opened — click the ★ Star button to support the project');
        break;
      }
      case 'github-share': {
        Promise.resolve(MO.copy(GH.repo))
          .then((ok) => toast(ok ? 'Repo link copied to clipboard — ready to share' : 'Share this link: ' + GH.repo, ok ? 'success' : 'info'))
          .catch(() => toast('Share this link: ' + GH.repo, 'info'));
        break;
      }
      case 'modal-close': closeModal(); break;
      case 'sorter-pause': {
        const paused = el.dataset.paused === '1';
        el.dataset.paused = paused ? '0' : '1';
        el.innerHTML = E.icon(paused ? 'pause' : 'play', 15) + '<span>' + (paused ? 'Pause' : 'Resume') + '</span>';
        MO.pause(!paused);
        const st = $('#sorterStatus'); if (st) st.textContent = paused ? 'Organizing…' : 'Paused';
        break;
      }
      case 'sorter-cancel': MO.cancel(); toast('Cancelling after current file…', 'info'); break;
      case 'sorter-close': closeModal(); render(); break;
      default: break;
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.id === 'rulesFile' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error('Expected an array of rules');
          S.rules = data; persist(); render(); toast('Imported ' + data.length + ' rules');
        } catch (err) { toast('Invalid rules file: ' + err.message, 'error'); }
      };
      reader.readAsText(t.files[0]);
      return;
    }
    if (t.dataset.fileCheck) {
      const p = S.plan.find((x) => x.id === t.dataset.fileCheck);
      if (p) p.selected = t.checked;
      render(); return;
    }
    if (t.dataset.selectAll !== undefined) {
      const ids = new Set(filteredPlan().map((p) => p.id));
      S.plan.forEach((p) => { if (ids.has(p.id)) p.selected = t.checked; });
      render(); return;
    }
    if (t.dataset.catSelect) {
      const p = S.plan.find((x) => x.id === t.dataset.catSelect);
      if (p) { p.category = t.value; p.override = true; p.dest = E.destinationFor(p, S.rules, S.settings, S.root); }
      render(); return;
    }
    if (t.dataset.sort !== undefined) { S.sort = t.value; render(); return; }
    if (t.dataset.filterCategory !== undefined) { S.categoryFilter = t.value; render(); return; }
    if (t.dataset.setting) {
      const key = t.dataset.setting;
      let value;
      if (t.type === 'checkbox') value = t.checked;
      else if (t.type === 'number') value = Number(t.value);
      else if (key === 'excludes') value = t.value.split(',').map((s) => s.trim()).filter(Boolean);
      else if (key === 'minSizeText') { S.settings.minSize = E.parseSize(t.value); value = null; }
      else if (key === 'categoryFilter') { S.categoryFilter = t.value; value = null; }
      else value = t.value;
      if (value !== null) S.settings[key] = value;
      if (key === 'theme' || key === 'accent') applyTheme();
      if (key === 'defaultFolder' && value) S.root = value;
      if (key === 'scheduleEnabled' || key === 'scheduleInterval') setupScheduler();
      if (key === 'keeperPolicy') applyKeeperPolicy();
      if (key === 'duplicateAction' || key === 'dateGrouping' || key === 'dateTemplate' || key === 'preserveStructure' || key === 'conflictPolicy') {
        for (const p of S.plan) p.dest = E.destinationFor(p, S.rules, S.settings, S.root);
      }
      persist(); render();
      return;
    }
    if (t.dataset.setting === undefined && t.dataset.action === 'toggle-setting') return;
  }

  function onInput(e) {
    if (e.target.dataset.filter !== undefined) {
      clearTimeout(S.searchTimer);
      const value = e.target.value;
      S.searchTimer = setTimeout(() => { S.filter = value; S.visibleRows = 150; render(); }, 180);
    }
  }

  /* toggle switches are divs, handled here ---------------------------------- */
  document.addEventListener('click', (e) => {
    const swEl = e.target.closest('[data-action="toggle-setting"]');
    if (!swEl) return;
    const key = swEl.dataset.key;
    S.settings[key] = !S.settings[key];
    if (key === 'scheduleEnabled') setupScheduler();
    persist(); render();
  }, true);

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
