/* MeetOrganizer Pro — shared pure logic (no DOM, no Node APIs).
 * Works identically in Electron and in the browser preview.
 */
(function (global) {
  'use strict';

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.6.64 1.03 1.26 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    play: '<path d="m7 4 13 8-13 8V4Z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    x: '<path d="M6 6 18 18M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    video: '<rect x="2" y="5" width="16" height="14" rx="2"/><path d="m18 10 4-2v8l-4-2"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/>',
    sparkles: '<path d="m12 3 1.8 4.3L18 9l-4.2 1.7L12 15l-1.8-4.3L6 9l4.2-1.7L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    minimize: '<path d="M5 12h14"/>',
    maximize: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    close: '<path d="M6 6 18 18M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    filter: '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4 6 6 0 0 0-9-6Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    drive: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15h4M14 15h4"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v6M9 14h6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tag: '<path d="M20 12 12 20l-9-9V3h8l9 9Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    star: '<path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6Z"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
    wand: '<path d="m4 20 12-12 3 3L7 23l-3-3Z"/><path d="M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM20 10l.7 1.3L22 12l-1.3.7L20 14l-.7-1.3L18 12l1.3-.7L20 10Z"/>'
  };

  function icon(name, size) {
    const s = size || 18;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.file) + '</svg>';
  }

  const DEFAULT_RULES = [
    { id: 'screenshots', name: 'Screenshots', folder: 'Screenshots', color: '#f472b6', glyph: 'image', enabled: true, priority: 1, custom: false, match: { ext: ['png','jpg','jpeg','gif','webp','bmp','heic'], regex: '(screenshot|screen ?shot|snip|scrot|capture|截图|snapseed)', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'recordings', name: 'Screen Recordings', folder: 'Screen Recordings', color: '#fb7185', glyph: 'video', enabled: true, priority: 2, custom: false, match: { ext: ['mp4','mov','mkv','webm','avi','gif'], regex: '(screen ?record|screenrecord|screenRecording|录屏|obs|quicktime)', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'images', name: 'Images', folder: 'Images', color: '#a78bfa', glyph: 'image', enabled: true, priority: 10, custom: false, match: { ext: ['png','jpg','jpeg','gif','webp','bmp','svg','ico','tif','tiff','heic','avif','psd','ai','eps'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'videos', name: 'Videos', folder: 'Videos', color: '#fb923c', glyph: 'video', enabled: true, priority: 11, custom: false, match: { ext: ['mp4','mov','mkv','webm','avi','wmv','flv','m4v','mpg','mpeg','3gp'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'audio', name: 'Audio', folder: 'Audio', color: '#facc15', glyph: 'music', enabled: true, priority: 12, custom: false, match: { ext: ['mp3','wav','flac','aac','ogg','m4a','wma','aiff','opus','mid'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'pdfs', name: 'PDFs', folder: 'PDFs', color: '#f87171', glyph: 'file', enabled: true, priority: 13, custom: false, match: { ext: ['pdf'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'documents', name: 'Documents', folder: 'Documents', color: '#60a5fa', glyph: 'file', enabled: true, priority: 14, custom: false, match: { ext: ['doc','docx','txt','rtf','odt','pages','md','tex','wps'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'spreadsheets', name: 'Spreadsheets', folder: 'Spreadsheets', color: '#34d399', glyph: 'chart', enabled: true, priority: 15, custom: false, match: { ext: ['xls','xlsx','csv','ods','numbers','tsv'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'presentations', name: 'Presentations', folder: 'Presentations', color: '#c084fc', glyph: 'layers', enabled: true, priority: 16, custom: false, match: { ext: ['ppt','pptx','key','odp','pps'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'ebooks', name: 'Ebooks', folder: 'Ebooks', color: '#2dd4bf', glyph: 'file', enabled: true, priority: 17, custom: false, match: { ext: ['epub','mobi','azw','azw3','djvu','fb2'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'archives', name: 'Archives', folder: 'Archives', color: '#fbbf24', glyph: 'archive', enabled: true, priority: 18, custom: false, match: { ext: ['zip','rar','7z','tar','gz','bz2','xz','iso','tgz','zst'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'installers', name: 'Installers', folder: 'Installers', color: '#94a3b8', glyph: 'download', enabled: true, priority: 19, custom: false, match: { ext: ['exe','msi','dmg','pkg','deb','rpm','appimage','apk','ipa','bat','sh'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'code', name: 'Code & Web', folder: 'Code', color: '#38bdf8', glyph: 'code', enabled: true, priority: 20, custom: false, match: { ext: ['js','ts','jsx','tsx','html','css','scss','py','java','c','cpp','h','go','rs','rb','php','json','yml','yaml','xml','sql','sh','ipynb','vue','svelte'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'design', name: 'Design Files', folder: 'Design', color: '#e879f9', glyph: 'palette', enabled: true, priority: 21, custom: false, match: { ext: ['fig','sketch','xd','psd','ai','eps','indd','blend','svg','dwg'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'fonts', name: 'Fonts', folder: 'Fonts', color: '#a3e635', glyph: 'tag', enabled: true, priority: 22, custom: false, match: { ext: ['ttf','otf','woff','woff2','eot','fon'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'data', name: 'Data & Backups', folder: 'Data', color: '#22d3ee', glyph: 'drive', enabled: true, priority: 23, custom: false, match: { ext: ['db','sqlite','bak','dump','parquet','avro','h5','pkl','bin','img','vhd'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'torrents', name: 'Torrents', folder: 'Torrents', color: '#818cf8', glyph: 'download', enabled: true, priority: 24, custom: false, match: { ext: ['torrent','nzb'], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'duplicates', name: 'Duplicates', folder: 'Duplicates', color: '#f97316', glyph: 'copy', enabled: true, priority: 90, custom: false, match: { ext: [], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } },
    { id: 'others', name: 'Other Files', folder: 'Other', color: '#94a3b8', glyph: 'file', enabled: true, priority: 99, custom: false, match: { ext: [], regex: '', minSize: 0, maxSize: 0, maxAgeDays: 0 } }
  ];

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    accent: 'violet',
    defaultFolder: '',
    recursive: true,
    maxDepth: 4,
    includeHidden: false,
    skipCategoryFolders: true,
    minSize: 0,
    excludes: ['*.tmp', '*.crdownload', '*.part', 'desktop.ini', 'thumbs.db'],
    hashAlgorithm: 'sha256',
    detectDuplicates: true,
    keeperPolicy: 'newest',
    duplicateAction: 'duplicates',
    conflictPolicy: 'rename',
    dateGrouping: false,
    dateTemplate: 'YYYY/MM',
    preserveStructure: false,
    animation: true,
    animationSpeed: 55,
    showSorter: true,
    autoOrganize: false,
    watchFolders: [],
    watchDebounce: 5,
    scheduleEnabled: false,
    scheduleInterval: 60,
    notify: true,
    logLevel: 'normal',
    maxFiles: 25000
  };

  const UNLOCKED = [
    ['One folder at a time', 'Multiple watched folders + batch queue'],
    ['Top-level loose files only', 'Recursive scanning with depth control'],
    ['6 fixed categories', '18 smart categories + unlimited custom rules'],
    ['Size + hash, review only', 'Full SHA-256 groups, keeper choice, Recycle Bin'],
    ['No undo after sorting', 'One-click full session restore'],
    ['Manual start only', 'Live folder watch + timed auto-organize'],
    ['No per-file control', 'Preview, filter, exclude, override every file'],
    ['Windows / macOS binary', 'Cross-platform source you own and can extend']
  ];

  function uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let i = -1, v = n;
    do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
    return v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2) + ' ' + units[i];
  }
  function formatNumber(n) { return (Number(n) || 0).toLocaleString('en-US'); }
  function formatDate(ms, withTime) {
    if (!ms) return '—';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return withTime ? date + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : date;
  }
  function timeAgo(iso) {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    const diff = Math.max(0, Date.now() - t);
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return formatDate(t);
  }
  function sepFor(root) { return String(root || '').indexOf('\\') > -1 ? '\\' : '/'; }
  function joinPath(root) {
    const sep = sepFor(root);
    const parts = Array.prototype.slice.call(arguments, 1)
      .filter((p) => p !== '' && p != null)
      .map((p) => String(p).replace(/[\\/]+/g, sep));
    let base = String(root || '').replace(/[\\/]+$/, '');
    for (const p of parts) base += sep + p.replace(new RegExp('\\' + sep + '+', 'g'), sep).replace(new RegExp('^\\' + sep + '|\\' + sep + '$', 'g'), '');
    return base;
  }
  function dateToken(ms, template) {
    const d = new Date(ms || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(template || 'YYYY/MM')
      .replace(/YYYY/g, d.getFullYear()).replace(/YY/g, String(d.getFullYear()).slice(-2))
      .replace(/MMM/g, months[d.getMonth()]).replace(/MM/g, pad(d.getMonth() + 1))
      .replace(/DD/g, pad(d.getDate())).replace(/HH/g, pad(d.getHours()));
  }

  function sortedRules(rules) {
    return (rules || []).slice().sort((a, b) => (Number(a.priority) || 50) - (Number(b.priority) || 50));
  }
  function ruleById(rules, id) { return (rules || []).find((r) => r.id === id) || (rules || []).find((r) => r.id === 'others') || DEFAULT_RULES[DEFAULT_RULES.length - 1]; }
  function categoryFolders(rules) { return (rules || []).map((r) => r.folder); }

  function conditionsPass(file, match) {
    const m = match || {};
    if (m.minSize && file.size < Number(m.minSize)) return false;
    if (m.maxSize && file.size > Number(m.maxSize)) return false;
    if (m.maxAgeDays && Date.now() - file.mtime > Number(m.maxAgeDays) * 86400000) return false;
    return true;
  }

  function classify(file, rules) {
    const ext = String(file.ext || '').toLowerCase();
    const name = String(file.name || '');
    for (const rule of sortedRules(rules)) {
      if (!rule.enabled) continue;
      const m = rule.match || {};
      if (!conditionsPass(file, m)) continue;
      if (m.regex) {
        let re;
        try { re = new RegExp(m.regex, 'i'); } catch (_) { re = null; }
        if (re && re.test(name) && (!m.ext || !m.ext.length || m.ext.map((e) => e.toLowerCase()).includes(ext))) return rule.id;
      }
      if (m.ext && m.ext.length && m.ext.map((e) => String(e).toLowerCase().replace(/^\./, '')).includes(ext)) return rule.id;
      if (rule.id === 'others') return 'others';
    }
    return 'others';
  }

  function destinationFor(item, rules, settings, root) {
    const rule = ruleById(rules, item.category);
    const parts = [rule.folder];
    if (settings.dateGrouping) parts.push(dateToken(item.mtime, settings.dateTemplate));
    if (settings.preserveStructure && item.dir) parts.push(item.dir);
    parts.push(item.name);
    return joinPath.apply(null, [root].concat(parts));
  }

  function groupDuplicates(files, hashMap, keeperPolicy) {
    const buckets = new Map();
    for (const f of files) {
      const hash = hashMap && hashMap[f.path];
      if (!hash) continue;
      const key = hash + ':' + f.size;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(f);
    }
    const groups = [], extras = new Map();
    let reclaimable = 0;
    for (const [key, list] of buckets) {
      if (list.length < 2) continue;
      const sorted = list.slice().sort((a, b) => {
        if (keeperPolicy === 'oldest') return a.mtime - b.mtime;
        if (keeperPolicy === 'shortest') return a.path.length - b.path.length;
        if (keeperPolicy === 'first') return a.name.localeCompare(b.name);
        return b.mtime - a.mtime;
      });
      const id = uid('dup');
      const keeper = sorted[0];
      const copies = sorted.slice(1);
      reclaimable += copies.reduce((sum, f) => sum + f.size, 0);
      groups.push({ id, hash: key.split(':')[0], size: keeper.size, keeper, copies, files: sorted });
      for (const c of copies) extras.set(c.id, id);
    }
    groups.sort((a, b) => (b.copies.length * b.size) - (a.copies.length * a.size));
    return { groups, extras, reclaimable, count: extras.size };
  }

  function buildPlan(files, rules, settings, root, dupInfo) {
    const extras = (dupInfo && dupInfo.extras) || new Map();
    return files.map((f) => {
      const dupGroup = extras.get(f.id) || null;
      const category = dupGroup ? (settings.duplicateAction === 'trash' ? 'duplicates' : 'duplicates') : classify(f, rules);
      const item = Object.assign({}, f, {
        category,
        originalCategory: dupGroup ? classify(f, rules) : category,
        dupGroup,
        selected: true,
        override: false
      });
      item.dest = destinationFor(item, rules, settings, root);
      return item;
    });
  }

  function summarize(plan) {
    const byCategory = new Map();
    let size = 0, selected = 0, selectedSize = 0;
    for (const p of plan) {
      size += p.size;
      if (!byCategory.has(p.category)) byCategory.set(p.category, { count: 0, size: 0 });
      const entry = byCategory.get(p.category);
      entry.count++; entry.size += p.size;
      if (p.selected) { selected++; selectedSize += p.size; }
    }
    return { total: plan.length, size, selected, selectedSize, byCategory };
  }

  function toCSV(rows) {
    return rows.map((row) => row.map((cell) => {
      const s = String(cell == null ? '' : cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
  }

  function parseSize(text) {
    const m = String(text || '').trim().match(/^([\d.]+)\s*(b|kb|mb|gb)?$/i);
    if (!m) return 0;
    const mult = { b: 1, kb: 1024, mb: 1048576, gb: 1073741824 }[(m[2] || 'b').toLowerCase()] || 1;
    return Math.round(parseFloat(m[1]) * mult);
  }

  global.ENGINE = {
    ICONS, icon, DEFAULT_RULES, DEFAULT_SETTINGS, UNLOCKED,
    uid, esc, formatBytes, formatNumber, formatDate, timeAgo,
    joinPath, sepFor, dateToken, sortedRules, ruleById, categoryFolders,
    classify, destinationFor, groupDuplicates, buildPlan, summarize,
    toCSV, parseSize
  };
})(window);
