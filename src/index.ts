import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import isElevated from 'is-elevated';
import dns from 'dns';

const execAsync = promisify(exec);
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Check for admin rights before creating window
const checkAdminRights = async (): Promise<void> => {
  const hasAdminRights = await isElevated();
  
  if (!hasAdminRights) {
    dialog.showErrorBox(
      'Administrator Rights Required',
      'This application needs to be run as Administrator. Please right-click and select "Run as Administrator".'
    );
    app.quit();
    return;
  }
  
  createWindow();
};

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', checkAdminRights);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    checkAdminRights();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const resolveHostname = async (hostname: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
};

// Handle website blocking
ipcMain.handle('block-website', async (_, website: string) => {
  try {
    const ips = await resolveHostname(website);
    for (const ip of ips) {
      const command = `netsh advfirewall firewall add rule name="Block ${website}" dir=out action=block remoteip=${ip}`;
      await execAsync(command);
    }
    return { success: true, message: `Successfully blocked ${website}` };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
});

// Handle website unblocking
ipcMain.handle('unblock-website', async (_, website: string) => {
  try {
    const command = `netsh advfirewall firewall delete rule name="Block ${website}"`;
    await execAsync(command);
    return { success: true, message: `Successfully unblocked ${website}` };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
});

// List blocked websites
ipcMain.handle('list-blocked', async () => {
  try {
    const { stdout } = await execAsync('netsh advfirewall firewall show rule name=all');
    const rules = stdout.split('\n')
      .filter(line => line.includes('Block '))
      .map(line => {
        const match = line.match(/Block (.*?)"/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    return rules;
  } catch (error) {
    return [];
  }
});