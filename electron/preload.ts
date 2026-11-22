import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi, RunEvent } from '../src/core/types';
const api: DesktopApi = {
  boot: () => ipcRenderer.invoke('boot'),
  saveSettings: (settings, key) => ipcRenderer.invoke('settings-save', settings, key),
  testConnection: (settings, key) => ipcRenderer.invoke('connection-test', settings, key),
  run: input => ipcRenderer.invoke('run', input),
  cancel: id => ipcRenderer.invoke('cancel', id),
  approve: (id, allow) => ipcRenderer.invoke('approve', id, allow),
  onEvent: cb => { const handler = (_: unknown, e: RunEvent) => cb(e); ipcRenderer.on('run-event', handler); return () => ipcRenderer.removeListener('run-event', handler); },
  deleteConversation: id => ipcRenderer.invoke('conversation-delete', id),
  importSkill: () => ipcRenderer.invoke('skill-import'),
  openSkills: () => ipcRenderer.invoke('skills-open'),
  testMcp: config => ipcRenderer.invoke('mcp-test', config),
  exportFile: (name, content) => ipcRenderer.invoke('export', name, content),
  openExternal: url => ipcRenderer.invoke('external', url),
  checkUpdate: () => ipcRenderer.invoke('update-check'),
};
contextBridge.exposeInMainWorld('divergence', api);
