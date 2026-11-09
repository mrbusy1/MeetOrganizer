/* Browser preview adapter.
 * When opened without Electron, the exact same UI runs on an in-memory sample
 * library so the whole app can be explored safely. No real files are touched.
 */
(function (global) {
  'use strict';
  if (global.MO) return; // Electron preload already provided the real API

  const listeners = new Map();
  const emit = (event, payload) => (listeners.get(event) || []).forEach((cb) => {
    try { cb(payload); } catch (err) { console.warn('demo listener', err); }
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const LS = (key, fallback) => {
    try { const raw = localStorage.getItem('mo_' + key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  };
  const save = (key, value) => { try { localStorage.setItem('mo_' + key, JSON.stringify(value)); } catch (_) {} };

  const ROOT = 'C:/Users/Mr.Busy/Downloads';
  const DAY = 86400000;
  const now = Date.now();

  const SEED = [
    ['Screenshot 2026-10-28 at 10.14.02.png', 'png', 1843200, 2, ''],
    ['Screenshot 2026-11-02 at 09.41.17.png', 'png', 2211840, 5, ''],
    ['screen-recording-demo.mp4', 'mp4', 48732160, 7, ''],
    ['Screen Recording 2026-11-01.mov', 'mov', 92160000, 8, ''],
    ['product-shot-purple.png', 'png', 3411456, 11, 'Assets'],
    ['team-retreat.jpg', 'jpg', 5242880, 14, 'Assets'],
    ['logo-final-v3.svg', 'svg', 184320, 1, 'Assets/Brand'],
    ['background-gradient.webp', 'webp', 921600, 20, 'Assets/Brand'],
    ['promo-launch-1080p.mp4', 'mp4', 157286400, 3, 'Media'],
    ['podcast-ep-12.wav', 'wav', 73400320, 24, 'Media'],
    ['jingle-master.mp3', 'mp3', 4194304, 31, 'Media'],
    ['Annual-Report-2025.pdf', 'pdf', 8912896, 12, ''],
    ['invoice-final.pdf', 'pdf', 348160, 4, ''],
    ['invoice-final (1).pdf', 'pdf', 348160, 4, ''],
    ['invoice-final (2).pdf', 'pdf', 348160, 6, 'Invoices'],
    ['contract-signed.pdf', 'pdf', 1258291, 18, 'Invoices'],
    ['meeting-notes.docx', 'docx', 49152, 1, ''],
    ['project-brief.md', 'md', 12288, 2, 'Work'],
    ['readme.txt', 'txt', 4096, 9, 'Work'],
    ['Q4-budget.xlsx', 'xlsx', 262144, 16, 'Work'],
    ['sales-data-2026.csv', 'csv', 1835008, 6, 'Work/Data'],
    ['pitch-deck.pptx', 'pptx', 6815744, 10, 'Work'],
    ['keynote-slides.key', 'key', 3145728, 33, 'Work'],
    ['the-lean-startup.epub', 'epub', 2097152, 40, ''],
    ['design-system.fig', 'fig', 12582912, 3, 'Design'],
    ['landing-page.sketch', 'sketch', 18350080, 22, 'Design'],
    ['inter-bold.ttf', 'ttf', 348160, 28, 'Design/Fonts'],
    ['inter-regular.woff2', 'woff2', 102400, 28, 'Design/Fonts'],
    ['client-assets.zip', 'zip', 62914560, 13, ''],
    ['client-assets (1).zip', 'zip', 62914560, 13, ''],
    ['backup-2026-10.tar.gz', 'gz', 209715200, 35, 'Backups'],
    ['photos-2025.rar', 'rar', 104857600, 52, 'Backups'],
    ['MeetOrganizer-Setup.exe', 'exe', 74448896, 21, ''],
    ['node-v22-x64.msi', 'msi', 31457280, 26, ''],
    ['photo-2024.jpg', 'jpg', 4194304, 44, 'Old'],
    ['photo-2024 - Copy.jpg', 'jpg', 4194304, 44, 'Old'],
    ['photo-2024 - Copy (2).jpg', 'jpg', 4194304, 45, 'Old'],
    ['dashboard.tsx', 'tsx', 24576, 2, 'Code'],
    ['api-client.ts', 'ts', 15360, 2, 'Code'],
    ['styles.css', 'css', 81920, 4, 'Code'],
    ['index.html', 'html', 12288, 4, 'Code'],
    ['config.yml', 'yml', 3072, 17, 'Code'],
    ['database.sqlite', 'sqlite', 8388608, 30, 'Backups'],
    ['export.json', 'json', 734003, 1, 'Work/Data'],
    ['ubuntu-26.04.iso', 'iso', 2684354560, 60, ''],
    ['dataset.parquet', 'parquet', 47185920, 19, 'Work/Data'],
    ['model-weights.bin', 'bin', 536870912, 48, 'Backups'],
    ['random-notes.webloc', 'webloc', 512, 90, ''],
    ['unknown-file.xyz', 'xyz', 20480, 120, ''],
    ['readme-unfinished.tmp', 'tmp', 1024, 0, ''],
    ['desktop.ini', 'ini', 282, 200, '']
  ];

  function pseudoHash(name, size) {
    const base = String(name).toLowerCase()
      .replace(/\s*\(\d+\)(?=\.[^.]+$)/g, '')
      .replace(/\s*-\s*copy(\s*\(\d+\))?/gi, '')
      .replace(/\s*copy\s*\d*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    let h1 = 0x811c9dc5, h2 = 0x1000193;
    const str = base + '|' + size;
    for (let i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ str.charCodeAt(i), 2246822519) + i) >>> 0;
    }
    return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') +
      Math.imul(h1 ^ h2, 2654435761).toString(16).padStart(8, '0')).slice(0, 40);
  }

  function seedFiles(root) {
    return SEED.map((row, i) => {
      const [name, ext, size, daysAgo, dir] = row;
      const rel = dir ? dir.replace(/\//g, '/') + '/' + name : name;
      return {
        id: 'demo_' + i,
        path: root + '/' + rel,
        name, ext, size,
        mtime: now - daysAgo * DAY - (i % 12) * 3600000,
        birthtime: now - (daysAgo + 2) * DAY,
        rel,
        dir: dir || '',
        depth: dir ? dir.split('/').length : 0
      };
    });
  }

  function matches(name, pattern) {
    const p = String(pattern).trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    try { return new RegExp('^' + p + '$', 'i').test(name); } catch (_) { return false; }
  }

  let demoState = { paused: false, cancelled: false };

  const seedSession = {
    id: 's_demo_1', createdAt: new Date(now - 2 * DAY).toISOString(),
    root: ROOT, undone: false, cancelled: false,
    stats: { moved: 38, skipped: 2, failed: 0, trashed: 0, total: 40 },
    moves: [], trashed: [], createdDirs: [], errors: []
  };

  global.MO = {
    isDesktop: false,
    info: async () => ({ version: '2.0.0', platform: 'web-preview', arch: 'x64', electron: 'preview', node: 'browser', home: 'C:/Users/Mr.Busy', downloads: ROOT, userData: 'in-memory' }),
    pickFolder: async () => ROOT,
    get: async (key) => LS(key, null),
    set: async (key, value) => { save(key, value); return true; },
    scan: async (options) => {
      const opts = options || {};
      const root = opts.root || ROOT;
      let files = seedFiles(root);
      if (!opts.recursive) files = files.filter((f) => !f.dir);
      if (opts.includeHidden === false) files = files.filter((f) => !f.name.startsWith('.'));
      if (opts.minSize) files = files.filter((f) => f.size >= opts.minSize);
      const excludes = opts.excludes || [];
      files = files.filter((f) => !excludes.some((p) => matches(f.name, p)));
      if (opts.skipCategoryFolders && opts.categoryFolders && opts.categoryFolders.length) {
        const set = opts.categoryFolders.map((s) => s.toLowerCase());
        files = files.filter((f) => !f.rel.split('/').some((part) => set.includes(part.toLowerCase())));
      }
      for (let i = 0; i <= files.length; i += 10) {
        emit('scan:progress', { count: Math.min(i, files.length), current: '' });
        await wait(12);
      }
      emit('scan:progress', { count: files.length, current: '', done: true });
      return files;
    },
    hash: async (paths) => {
      const out = {};
      for (let i = 0; i < paths.length; i++) {
        const name = String(paths[i]).split('/').pop();
        const found = SEED.find((r) => r[0] === name);
        out[paths[i]] = pseudoHash(name, found ? found[2] : 1);
        if (i % 5 === 0) { emit('hash:progress', { index: i + 1, total: paths.length }); await wait(6); }
      }
      emit('hash:progress', { index: paths.length, total: paths.length });
      return out;
    },
    organize: async (moves, options) => {
      const opts = options || {};
      demoState.paused = false; demoState.cancelled = false;
      const delay = Math.min(70, Math.max(8, Number(opts.delay) || 35));
      let moved = 0, failed = 0;
      const journal = [];
      for (let i = 0; i < moves.length; i++) {
        while (demoState.paused && !demoState.cancelled) await wait(100);
        if (demoState.cancelled) break;
        const m = moves[i];
        moved++;
        journal.push({ src: m.src, dest: m.dest, name: m.name, category: m.category });
        emit('organize:progress', { index: i + 1, total: moves.length, item: m, ok: true, status: 'moved' });
        await wait(delay);
      }
      const session = {
        id: 's' + Date.now(), createdAt: new Date().toISOString(), root: opts.root || ROOT,
        moves: journal, trashed: opts.trashPaths || [], createdDirs: [], errors: [],
        stats: { moved, skipped: 0, failed, trashed: (opts.trashPaths || []).length, total: moves.length },
        undone: false, cancelled: demoState.cancelled
      };
      const list = LS('sessions', [seedSession]);
      list.unshift(session); save('sessions', list.slice(0, 30));
      emit('organize:done', session);
      return session;
    },
    pause: async (value) => { demoState.paused = !!value; return demoState.paused; },
    cancel: async () => { demoState.cancelled = true; return true; },
    undo: async (id) => {
      const list = LS('sessions', [seedSession]);
      const s = list.find((x) => x.id === id);
      if (!s) throw new Error('Session not found');
      if (s.undone) throw new Error('Already restored');
      s.undone = true; s.restored = s.stats.moved; save('sessions', list);
      return { restored: s.stats.moved, missing: 0, trashed: 0 };
    },
    sessions: async () => LS('sessions', [seedSession]),
    session: async (id) => LS('sessions', [seedSession]).find((s) => s.id === id) || null,
    exportReport: (content, name) => {
      try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name || 'meetorganizer-report.csv'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return name || 'meetorganizer-report.csv';
      } catch (_) { return null; }
    },
    preview: async () => ({ type: 'none' }),
    openPath: async () => true,
    reveal: async () => true,
    openExternal: async (url) => { global.open(url, '_blank', 'noopener'); return true; },
    win: async () => true,
    watchStart: async (folders) => folders.length,
    watchStop: async () => true,
    on: (event, callback) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
      return () => {
        const arr = listeners.get(event) || [];
        const i = arr.indexOf(callback);
        if (i > -1) arr.splice(i, 1);
      };
    }
  };
})(window);
