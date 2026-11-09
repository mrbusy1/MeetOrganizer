/* MeetOrganizer Pro — main process
 * Local-first desktop file organizer. No network, no account, no telemetry.
 * Design & Developed by Mr.Busy — https://ai-1.art/
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const os = require('os');

const USER_DIR = app.getPath('userData');
const SESSIONS_DIR = path.join(USER_DIR, 'sessions');
const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');

let win = null;
let watchers = [];
let watchTimers = new Map();
const control = { paused: false, cancelled: false, busy: false };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (channel, payload) => {
  if (win && !win.isDestroyed() && win.webContents) win.webContents.send(channel, payload);
};

function ensureDirs() {
  try { fs.mkdirSync(SESSIONS_DIR, { recursive: true }); } catch (_) { /* ignore */ }
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function writeJSON(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (_) { return false; }
}

function createWindow() {
  ensureDirs();
  win = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0c12',
    show: false,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    title: 'MeetOrganizer Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { stopWatchers(); app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', stopWatchers);

/* ---------------------------------------------------------------- helpers */
function toRegExp(glob) {
  const s = String(glob || '').trim();
  if (!s) return null;
  try {
    const escaped = s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\u0001')
      .replace(/\*/g, '[^/\\]*')
      .replace(/\?/g, '[^/\\]')
      .replace(/\u0001/g, '.*');
    return new RegExp(escaped, 'i');
  } catch (_) { return null; }
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(target);
  const base = target.slice(0, target.length - ext.length);
  let n = 1, candidate;
  do { candidate = `${base} (${n++})${ext}`; } while (fs.existsSync(candidate) && n < 9999);
  return candidate;
}

async function moveFile(src, dest) {
  try {
    await fsp.rename(src, dest);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      await fsp.copyFile(src, dest);
      await fsp.unlink(src);
    } else if (err && err.code === 'ENOENT' && !fs.existsSync(src)) {
      throw new Error('Source file no longer exists');
    } else {
      throw err;
    }
  }
}

function hashFile(file, algorithm) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/* ------------------------------------------------------------------- scan */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '$recycle.bin', 'system volume information',
  'appdata', '__macosx', '.trashes', '.cache', 'windows', 'program files'
]);

async function scanFolder(opts) {
  const root = path.resolve(opts.root || '');
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('Folder does not exist or is not a directory.');
  }
  if (path.parse(root).root === root) {
    throw new Error('For safety, drive roots cannot be scanned. Pick a folder inside the drive.');
  }
  const recursive = !!opts.recursive;
  const maxDepth = Math.max(1, Math.min(12, Number(opts.maxDepth) || 4));
  const minSize = Math.max(0, Number(opts.minSize) || 0);
  const maxFiles = Math.max(100, Math.min(100000, Number(opts.maxFiles) || 25000));
  const includeHidden = !!opts.includeHidden;
  const skipCategoryFolders = opts.skipCategoryFolders !== false;
  const categoryFolders = new Set((opts.categoryFolders || []).map((s) => String(s).toLowerCase()));
  const excludes = (opts.excludes || []).map(toRegExp).filter(Boolean);
  const results = [];
  let seq = 0;

  const excluded = (name, rel) => {
    if (!includeHidden && name.startsWith('.')) return true;
    return excludes.some((re) => re.test(name) || re.test(rel));
  };

  async function walk(dir, depth) {
    if (results.length >= maxFiles) return;
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const ent of entries) {
      if (results.length >= maxFiles) break;
      const full = path.join(dir, ent.name);
      const rel = path.relative(root, full);
      if (excluded(ent.name, rel)) continue;

      if (ent.isDirectory()) {
        const lower = ent.name.toLowerCase();
        if (!recursive || depth >= maxDepth) continue;
        if (SKIP_DIRS.has(lower)) continue;
        if (skipCategoryFolders && categoryFolders.has(lower)) continue;
        await walk(full, depth + 1);
      } else if (ent.isFile()) {
        try {
          const stat = await fsp.stat(full);
          if (stat.size < minSize) continue;
          results.push({
            id: 'f' + (++seq),
            path: full,
            name: ent.name,
            ext: path.extname(ent.name).replace(/^\./, '').toLowerCase(),
            size: stat.size,
            mtime: stat.mtimeMs,
            birthtime: stat.birthtimeMs,
            rel,
            dir: path.dirname(rel) === '.' ? '' : path.dirname(rel),
            depth
          });
          if (results.length % 100 === 0) {
            send('evt:scan:progress', { count: results.length, current: full });
          }
        } catch (_) { /* unreadable file */ }
      }
    }
  }

  await walk(root, 0);
  send('evt:scan:progress', { count: results.length, current: '', done: true });
  return results;
}

/* --------------------------------------------------------------- organize */
async function runOrganize(payload) {
  if (control.busy) throw new Error('An organize session is already running.');
  control.busy = true;
  control.paused = false;
  control.cancelled = false;

  const moves = Array.isArray(payload.moves) ? payload.moves : [];
  const options = payload.options || {};
  const delay = Math.max(0, Math.min(500, Number(options.delay) || 0));
  const policy = options.conflictPolicy || 'rename';
  const trashList = options.trashPaths || [];
  const total = moves.length + trashList.length;
  const journal = [];
  const createdDirs = new Set();
  const trashed = [];
  const errors = [];
  let moved = 0, skipped = 0, failed = 0, processed = 0;

  try {
    for (const p of trashList) {
      while (control.paused && !control.cancelled) await sleep(120);
      if (control.cancelled) break;
      try { await shell.trashItem(p); trashed.push(p); }
      catch (err) { errors.push(`${p}: ${err.message}`); }
      processed++;
      send('evt:organize:progress', {
        index: processed, total,
        item: { name: path.basename(p), category: 'duplicates' }, ok: true, status: 'trashed'
      });
      if (delay) await sleep(delay);
    }

    for (let i = 0; i < moves.length; i++) {
      while (control.paused && !control.cancelled) await sleep(120);
      if (control.cancelled) break;
      const m = moves[i];
      let dest = m.dest;
      try {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          await fsp.mkdir(destDir, { recursive: true });
          createdDirs.add(destDir);
        }
        if (fs.existsSync(dest)) {
          if (policy === 'skip') {
            skipped++;
            send('evt:organize:progress', { index: processed + 1, total, item: m, ok: true, status: 'skipped' });
            processed++;
            if (delay) await sleep(delay);
            continue;
          }
          if (policy === 'overwrite') await fsp.rm(dest, { force: true });
          else dest = uniquePath(dest);
        }
        await moveFile(m.src, dest);
        journal.push({ src: m.src, dest, name: m.name, category: m.category });
        moved++;
        processed++;
        send('evt:organize:progress', { index: processed, total, item: m, ok: true, status: 'moved' });
      } catch (err) {
        failed++;
        processed++;
        errors.push(`${m.name || m.src}: ${err.message}`);
        send('evt:organize:progress', { index: processed, total, item: m, ok: false, status: 'error', error: err.message });
      }
      if (delay) await sleep(delay);
    }

    const session = {
      id: `s${Date.now()}`,
      createdAt: new Date().toISOString(),
      root: options.root || '',
      moves: journal,
      trashed,
      createdDirs: [...createdDirs],
      errors,
      stats: { moved, skipped, failed, trashed: trashed.length, total },
      undone: false,
      cancelled: control.cancelled
    };
    writeJSON(path.join(SESSIONS_DIR, session.id + '.json'), session);
    send('evt:organize:done', session);
    return session;
  } finally {
    control.busy = false;
  }
}

/* ------------------------------------------------------------------- IPC */
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  node: process.versions.node,
  home: os.homedir(),
  downloads: app.getPath('downloads'),
  userData: USER_DIR
}));

ipcMain.handle('dialog:pickFolder', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose a folder to organize',
    properties: ['openDirectory', 'createDirectory']
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('store:get', (_e, key) => readJSON(path.join(USER_DIR, `store-${key}.json`), null));
ipcMain.handle('store:set', (_e, key, value) => writeJSON(path.join(USER_DIR, `store-${key}.json`), value));
ipcMain.handle('fs:scan', (_e, opts) => scanFolder(opts || {}));

ipcMain.handle('fs:hash', async (_e, paths, algorithm) => {
  const algo = ['sha256', 'sha1', 'md5'].includes(algorithm) ? algorithm : 'sha256';
  const out = {};
  const list = paths || [];
  for (let i = 0; i < list.length; i++) {
    try { out[list[i]] = await hashFile(list[i], algo); }
    catch (_) { out[list[i]] = null; }
    if (i % 5 === 0 || i === list.length - 1) {
      send('evt:hash:progress', { index: i + 1, total: list.length });
    }
  }
  return out;
});

ipcMain.handle('fs:organize', (_e, payload) => runOrganize(payload || {}));
ipcMain.handle('fs:pause', (_e, value) => { control.paused = !!value; return control.paused; });
ipcMain.handle('fs:cancel', () => { control.cancelled = true; return true; });

ipcMain.handle('fs:undo', async (_e, sessionId) => {
  const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
  const session = readJSON(file, null);
  if (!session) throw new Error('Session not found.');
  if (session.undone) throw new Error('This session was already restored.');
  let restored = 0, missing = 0;
  for (const m of [...session.moves].reverse()) {
    try {
      if (!fs.existsSync(m.dest)) { missing++; continue; }
      await fsp.mkdir(path.dirname(m.src), { recursive: true });
      const target = fs.existsSync(m.src) ? uniquePath(m.src) : m.src;
      await moveFile(m.dest, target);
      restored++;
    } catch (_) { missing++; }
  }
  for (const dir of [...session.createdDirs].sort((a, b) => b.length - a.length)) {
    try { await fsp.rmdir(dir); } catch (_) { /* not empty — keep */ }
  }
  session.undone = true;
  session.undoneAt = new Date().toISOString();
  session.restored = restored;
  writeJSON(file, session);
  return { restored, missing, trashed: session.trashed.length };
});

ipcMain.handle('fs:sessions', () => {
  ensureDirs();
  try {
    return fs.readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJSON(path.join(SESSIONS_DIR, f), null))
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch (_) { return []; }
});

ipcMain.handle('fs:session', (_e, id) => readJSON(path.join(SESSIONS_DIR, `${id}.json`), null));

ipcMain.handle('fs:export', async (_e, content, defaultName) => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Export report',
    defaultPath: path.join(app.getPath('downloads'), defaultName || 'meetorganizer-report.csv'),
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });
  if (res.canceled || !res.filePath) return null;
  try { await fsp.writeFile(res.filePath, content, 'utf8'); return res.filePath; }
  catch (err) { throw new Error(err.message); }
});

ipcMain.handle('fs:preview', async (_e, file) => {
  try {
    const ext = path.extname(file).toLowerCase();
    const stat = await fsp.stat(file);
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext) && stat.size < 8 * 1024 * 1024) {
      const buf = await fsp.readFile(file);
      const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`;
      return { type: 'image', dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
    }
    if (/\.(txt|md|json|js|ts|css|html|xml|csv|log|yml|yaml|py|java|c|cpp|ini|cfg|sql|sh|bat)$/i.test(file) && stat.size < 512 * 1024) {
      return { type: 'text', text: (await fsp.readFile(file, 'utf8')).slice(0, 6000) };
    }
    return { type: 'none', size: stat.size };
  } catch (err) { return { type: 'none', error: err.message }; }
});

ipcMain.handle('shell:open', (_e, target) => shell.openPath(target));
ipcMain.handle('shell:reveal', (_e, target) => { shell.showItemInFolder(target); return true; });
ipcMain.handle('shell:external', (_e, url) => shell.openExternal(url));

ipcMain.handle('win:control', (_e, action) => {
  if (!win) return false;
  if (action === 'minimize') win.minimize();
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (action === 'close') win.close();
  return true;
});

function stopWatchers() {
  for (const w of watchers) { try { w.close(); } catch (_) {} }
  watchers = [];
  for (const t of watchTimers.values()) clearTimeout(t);
  watchTimers.clear();
}

ipcMain.handle('watch:start', (_e, folders) => {
  stopWatchers();
  for (const folder of folders || []) {
    try {
      const watcher = fs.watch(folder, { recursive: true }, (eventType, filename) => {
        const key = folder + ':' + (filename || '');
        clearTimeout(watchTimers.get(key));
        watchTimers.set(key, setTimeout(() => {
          watchTimers.delete(key);
          send('evt:watch:change', { folder, filename: filename || '', type: eventType });
        }, 2500));
      });
      watchers.push(watcher);
    } catch (_) { /* folder unavailable */ }
  }
  return watchers.length;
});
ipcMain.handle('watch:stop', () => { stopWatchers(); return true; });

/* Built-in self-test: `npm start -- --smoke` verifies the window, preload and IPC. */
if (process.argv.includes('--smoke')) {
  app.whenReady().then(async () => {
    await new Promise((r) => setTimeout(r, 2500));
    const target = BrowserWindow.getAllWindows()[0];
    if (!target) { console.log('SMOKE_RESULT={"error":"no window"}'); app.exit(1); return; }
    try {
      const result = await target.webContents.executeJavaScript(`(async () => {
        const info = await window.MO.info();
        const probe = await window.MO.get('__smoke_probe__');
        return {
          isDesktop: window.MO.isDesktop, version: info.version, platform: info.platform,
          downloads: info.downloads, storeProbe: probe,
          viewText: (document.querySelector('#view') || {}).textContent?.length || 0,
          footerHasCredit: document.querySelector('.app-footer').textContent.includes('Design and Developed by Mr.Busy'),
          footerHasSite: document.querySelector('.app-footer').textContent.includes('ai-1.art'),
          engine: !!window.ENGINE, navCount: document.querySelectorAll('#nav .nav-item').length
        };
      })()`);
      console.log('SMOKE_RESULT=' + JSON.stringify(result));
      app.exit(0);
    } catch (err) { console.log('SMOKE_ERROR=' + err.message); app.exit(1); }
  });
}
