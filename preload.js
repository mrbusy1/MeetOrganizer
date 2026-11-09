/* Secure bridge between the renderer and the local file system. */
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('MO', {
  isDesktop: true,
  info: () => invoke('app:info'),
  pickFolder: () => invoke('dialog:pickFolder'),
  get: (key) => invoke('store:get', key),
  set: (key, value) => invoke('store:set', key, value),
  scan: (options) => invoke('fs:scan', options),
  hash: (paths, algorithm) => invoke('fs:hash', paths, algorithm),
  organize: (moves, options) => invoke('fs:organize', { moves, options }),
  pause: (value) => invoke('fs:pause', value),
  cancel: () => invoke('fs:cancel'),
  undo: (id) => invoke('fs:undo', id),
  sessions: () => invoke('fs:sessions'),
  session: (id) => invoke('fs:session', id),
  exportReport: (content, name) => invoke('fs:export', content, name),
  preview: (file) => invoke('fs:preview', file),
  openPath: (target) => invoke('shell:open', target),
  reveal: (target) => invoke('shell:reveal', target),
  openExternal: (url) => invoke('shell:external', url),
  win: (action) => invoke('win:control', action),
  watchStart: (folders) => invoke('watch:start', folders),
  watchStop: () => invoke('watch:stop'),
  on: (event, callback) => {
    const channel = 'evt:' + event;
    const wrapped = (_e, payload) => callback(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  }
});
