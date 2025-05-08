// src/main/background.ts
process.title = "Anyone VPN";

import { app, globalShortcut, nativeImage, Tray, Menu } from "electron";
import { createMainWindow } from "./windows";
import { createTray, CreateHTMLTray } from "./tray";
import { setupIpcHandlers } from "./ipcHandlers";
import { checkForUpdates } from "./updater";
import { stopAnyoneProxy } from "./proxy";
import { setProxySettings } from "./systemProxy";
import { isProd } from "./constants";
import { createAppMenu } from "./app.menu";
import { initializeState, state } from "./state";
import log from 'electron-log/main';
import path from "path";

(async () => {

  app.setName("Anyone VPN");
  log.initialize({ preload: true });
  console.log = log.log;
  const platform = process.platform;
  if (process.platform === "darwin") {
    app.setAboutPanelOptions({
      applicationName: "Anyone VPN",
      applicationVersion: "1.0.0",
      copyright: "© 2023 Anyone VPN Inc.",
      credits: "Developed by Anyone VPN Team",
      iconPath: path.join(app.getAppPath(), "resources", "icon.png"),
    });
  }

  await app.whenReady().then(() => {
    createAppMenu();

    if (platform === "darwin") {
      const dockedIconPath = path.join(
        app.getAppPath(),
        "resources",
        "icon.png"
      );

      app.dock.setIcon(dockedIconPath);
      app.dock.setBadge("Anyone");

      app.dock.show();
    }
    app.setName("Anyone VPN");
  });

  app.name = "Anyone VPN";

  // set the icon
  // Initialize shared state
  initializeState();

  const mainWindow = createMainWindow();
  // createTray(mainWindow);
  CreateHTMLTray();

  // createTray(mainWindow);
  setupIpcHandlers(mainWindow);

  // Register global shortcuts
  let menuBarVisible = false;
  globalShortcut.register("CmdOrCtrl+Shift+M", () => {
    menuBarVisible = !menuBarVisible;
    mainWindow.setAutoHideMenuBar(!menuBarVisible);
    mainWindow.setMenuBarVisibility(menuBarVisible);
    console.log(`Menu bar is now ${menuBarVisible ? "visible" : "hidden"}`);
  });

  app.on("quit", async () => {
    if (state.anon) {
      setProxySettings(false, state.proxyPort);
      state.isQuitting = true;
      await stopAnyoneProxy();
    }
    console.log("All windows closed - quitting app");
    app.quit();
  });

  // Handle application events
  app.on("before-quit", async () => {
    setProxySettings(false, state.proxyPort);
    if (state.anon) {
      state.isQuitting = true;

      await stopAnyoneProxy();
    }
  });

  app.on("window-all-closed", async () => {
    if (platform === "darwin") {
      app.dock.hide();
    }
    mainWindow.hide();
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  // Check for updates
  checkForUpdates();
})();

export { app };
