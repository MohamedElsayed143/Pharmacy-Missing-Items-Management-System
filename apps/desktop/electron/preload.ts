import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  isWindows7: () => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,
  isWindows7: () => ipcRenderer.invoke('app:is-windows7'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
