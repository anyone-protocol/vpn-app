// src/main/windows.ts
import { app, BrowserWindow, screen, nativeImage, ipcMain } from "electron";
import path from "path";
import { createWindow } from "./helpers";
import { isProd } from "./constants";
import { state } from "./state";
import Store from "electron-store";
const store = new Store();

export function createMainWindow(): BrowserWindow {
  let iconPath = path.join(app.getAppPath(), "resources", "icon.png");
  let isFrame = true;
  const platform = process.platform;
  if (platform === "win32") {
    isFrame = false;
  }
  const mainWindow = createWindow("main", {
    width: 400,
    height: 700,
    frame: true,
    autoHideMenuBar: true,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: true,
    },
    icon: nativeImage.createFromPath(iconPath),
    title: "Anyone VPN",
  });

  mainWindow.setMinimumSize(400, 700);

  if (isProd) {
    mainWindow.loadURL("app://./index.html");
  } else {
    const port = process.argv[2];
    mainWindow.loadURL(`http://localhost:${port}/`);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Prevent default behavior for Command key alone
    if (input.meta && !input.key.toLowerCase()) {
      event.preventDefault();
    }

    // Prevent default behavior for Command+W
    if (input.meta && input.key.toLowerCase() === "w") {
      event.preventDefault();
      mainWindow.hide(); // Minimize the window instead of closing
    }
  });

  mainWindow.on("close", (event) => {
    event.preventDefault();
    if (platform === "darwin") {
      app.dock.hide();
    }
    mainWindow.hide();
    state.tray.app.quit();
    state.tray.app.exit();
  });

  mainWindow.on("system-context-menu", (event) => {
    event.preventDefault();
  });

  mainWindow.on("minimize", () => {
    mainWindow.setSkipTaskbar(true);
  });

  mainWindow.on("resize", () => {
    const [width, height] = mainWindow.getSize();
    mainWindow.webContents.send("window-resize", height, width);
  });

  mainWindow.on("restore", () => {
    mainWindow.setSkipTaskbar(false);
  });

  // Save reference to mainWindow in state
  state.mainWindow = mainWindow;

  if (state?.mainWindow) {
    const screenSize = screen.getPrimaryDisplay().workAreaSize;
    state.screenSize = screenSize;
  }

  return mainWindow;
}

export function expandMainWindow() {
  const { mainWindow } = state;
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const showAnimations = store.get("showAnimations", true);

    const newWidth = showAnimations
      ? Math.max(Math.round(width * 0.8), 1024)
      : Math.max(Math.round(width * 0.5), 400);
    const newHeight = showAnimations
      ? Math.max(Math.round(height * 0.8), 720)
      : Math.max(Math.round(height * 0.8), 700);

    mainWindow.setSize(newWidth, newHeight);
    mainWindow.center();

    // if (isProd) {
    //   mainWindow.loadURL("app://./expanded.html");
    // } else {
    //   const port = process.argv[2];
    //   mainWindow.loadURL(`http://localhost:${port}/expanded`);
    // }
  }
}

export function minimizeMainWindow() {
  const { mainWindow } = state;
  if (mainWindow) {
    mainWindow.setSize(400, 700);
    mainWindow.center();
    // if (isProd) {
    //   mainWindow.loadURL("app://./index.html");
    // } else {
    //   const port = process.argv[2];
    //   mainWindow.loadURL(`http://localhost:${port}/`);
    // }
  }
}
