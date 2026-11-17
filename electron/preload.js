// Secure bridge between the renderer and the main process
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const toTransferable = async (data) => {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return data;
};

contextBridge.exposeInMainWorld('wtp', {
  platform: process.platform,
  trial: (() => { try { return ipcRenderer.sendSync('trial-status'); } catch { return null; } })(),
  onTrialExpired: (cb) => ipcRenderer.on('trial-expired', (_e, t) => cb(t)),
  activateLicence: (key) => ipcRenderer.invoke('licence-activate', key),
  initialFile: () => ipcRenderer.invoke('initial-file'),
  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: (content, filePath, defaultName) => ipcRenderer.invoke('save-project', content, filePath, defaultName),
  saveFile: async (defaultName, data) => ipcRenderer.invoke('save-file', defaultName, await toTransferable(data)),
  exportPDF: (html, defaultName, headerText, opts) => ipcRenderer.invoke('export-pdf', html, defaultName, headerText, opts || {}),
  setTitle: (title) => ipcRenderer.send('set-title', title),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  quit: () => ipcRenderer.send('quit'),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, f) => cb(f)),
  onCloseRequest: (cb) => ipcRenderer.on('close-request', () => cb()),
  closeResponse: (ok) => ipcRenderer.send('close-response', ok),
});
