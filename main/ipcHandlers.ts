// src/main/ipcHandlers.ts
import { ipcMain, BrowserWindow, nativeTheme, screen } from "electron";
import { getGroupedConnectedProcesses } from "./utils/getConnectedProcesses";
import { setAutoLaunch, isAutoLaunchEnabled } from "./autoLaunch";
import { autoUpdater } from "electron-updater";
import Store from "electron-store";
import { checkForUpdates } from "./updater";
import { startAnyoneProxy, stopAnyoneProxy } from "./proxy";
import {
  checkIP,
  getGeolocation,
  getGeolocationByCoords,
  getIcon,
} from "./utils";
import {
  createSettingsWindow,
  expandMainWindow,
  minimizeMainWindow,
  hideSettingsWindow,
} from "./windows";
import { setProxySettings } from "./systemProxy";
import { state } from "./state";
import { app } from "./background";
import { UpdateTrayIcon } from "./tray";

const store = new Store();

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  // Processes IPC Handler
  ipcMain.handle(
    "get-grouped-connected-processes",
    async (_event, port: number) => {
      try {
        const groupedProcesses = await getGroupedConnectedProcesses(port);
        return groupedProcesses;
      } catch (error) {
        console.error("Error fetching grouped processes:", error);
        return [];
      }
    }
  );

  // Auto-launch handlers
  ipcMain.handle("set-auto-launch", async (_event, enable: boolean) => {
    try {
      await setAutoLaunch(enable);
    } catch (error) {
      console.error("Error setting auto-launch:", error);
    }
  });

  ipcMain.handle("is-auto-launch-enabled", async () => {
    try {
      return await isAutoLaunchEnabled();
    } catch (error) {
      console.error("Error checking auto-launch status:", error);
      return false;
    }
  });

  // IPC handlers for updates
  ipcMain.handle("download-update", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("check-for-updates", () => {
    checkForUpdates();
  });

  ipcMain.handle("get-auto-update-preference", () => {
    const enabled = store.get("autoUpdateEnabled", true);
    return enabled;
  });

  ipcMain.handle("set-auto-update-preference", (_event, enabled: boolean) => {
    store.set("autoUpdateEnabled", enabled);
  });

  // IPC Handlers for Proxy Control
  ipcMain.handle("start-proxy", async () => {
    console.log("Starting proxy");
    await startAnyoneProxy();
    UpdateTrayIcon();
  });

  ipcMain.handle("stop-proxy", async () => {
    await stopAnyoneProxy();
    UpdateTrayIcon();
  });

  ipcMain.handle("check-ip", async (_event, useProxy: boolean) => {
    const ip = await checkIP(useProxy);
    return ip;
  });

  ipcMain.handle("get-real-ip", () => {
    return state.realIp;
  });

  ipcMain.handle("get-proxy-ip", () => {
    return state.proxyIp;
  });

  ipcMain.handle("get-relay-ip", () => {
    return state.relayIp;
  });

  ipcMain.handle("get-number-of-relays", () => {
    return state.numberOfRelays;
  });

  ipcMain.handle("get-relay-data", () => {
    return state.relayData;
  });

  // Settings page
  ipcMain.handle("open-settings-window", () => {
    createSettingsWindow();
  });

  ipcMain.handle("hide-settings-window", () => {
    hideSettingsWindow();
  });

  ipcMain.handle("close-settings-window", () => {
    state.settingsWindow?.hide();
  });

  ipcMain.handle("get-screen-size", () => {
    return state.screenSize;
  });

  // Controls
  ipcMain.handle("close-app", () => {
    mainWindow.close();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  ipcMain.handle("minimize-app", () => {
    mainWindow.minimize();
  });

  ipcMain.handle("expand-app", () => {
    expandMainWindow();
  });

  ipcMain.handle("minimize-expanded-app", () => {
    minimizeMainWindow();
  });

  ipcMain.handle("quit-app", async () => {
    state.isQuitting = true;
    setProxySettings(false, state.proxyPort);
    await stopAnyoneProxy();
    state.tray.app.quit();
    state.tray.app.exit();
    app.quit();
  });

  ipcMain.handle("show-main-window", () => {
    mainWindow.show();
  });
  // is-proxy-running
  ipcMain.handle("is-proxy-running", () => {
    return state.isProxyRunning;
  });

  // Geolocation
  ipcMain.handle("get-geolocation", async (_event, ip: string) => {
    return await getGeolocation(ip);
  });

  ipcMain.handle(
    "get-geolocation-by-coords",
    async (_event, lat: number, lon: number) => {
      return await getGeolocationByCoords(lat, lon);
    }
  );

  // Icon
  ipcMain.handle("get-icon", async (_event, iconPath: string) => {
    return await getIcon(iconPath);
  });

  // Proxy Port
  ipcMain.handle("get-proxy-port", () => {
    return state.proxyPort;
  });

  ipcMain.handle("get-anon-port", () => {
    return state.anonPort;
  });

  // change proxy port
  ipcMain.handle("change-proxy-port", async (_event, port: number) => {
    if (!state.isProxyRunning) {
      state.proxyPort = port;
      state.mainWindow?.webContents.send("proxy-port-changed", port);
      state.tray?.window?.webContents.send("proxy-port-changed", port);
    } else {
      console.log("Cannot change proxy port while proxy is running.");
    }
  });

  ipcMain.handle("change-anon-port", async (_event, port: number) => {
    if (!state.isProxyRunning) {
      state.anonPort = port;
      state.anonControlPort = port + 1;
      state.mainWindow?.webContents.send("anon-port-changed", port);
      state.tray?.window?.webContents.send("anon-port-changed", port);
    } else {
      console.log("Cannot change anyone port while proxy is running.");
    }
  });

  ipcMain.handle("dark-mode:toggle", () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = "light";
    } else {
      nativeTheme.themeSource = "dark";
    }
    return nativeTheme.shouldUseDarkColors;
  });

  ipcMain.handle("dark-mode:system", () => {
    nativeTheme.themeSource = "system";
  });
}
