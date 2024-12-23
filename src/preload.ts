import { contextBridge, ipcRenderer } from 'electron';

export type BlockResult = {
  success: boolean;
  message: string;
};

contextBridge.exposeInMainWorld('electronAPI', {
  blockWebsite: (website: string) => ipcRenderer.invoke('block-website', website),
  unblockWebsite: (website: string) => ipcRenderer.invoke('unblock-website', website),
  listBlocked: () => ipcRenderer.invoke('list-blocked'),
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      blockWebsite: (website: string) => Promise<BlockResult>;
      unblockWebsite: (website: string) => Promise<BlockResult>;
      listBlocked: () => Promise<string[]>;
    };
  }
}