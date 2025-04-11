import {
  screen,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Rectangle,
} from "electron";
import Store from "electron-store";

// Define an interface for WindowState
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export const createWindow = (
  windowName: string,
  options: BrowserWindowConstructorOptions
): BrowserWindow => {
  const key = "window-state";
  const name = `window-state-${windowName}`;
  const store = new Store<WindowState>({ name });

  const defaultSize: WindowState = {
    width: options.width ?? 800,
    height: options.height ?? 600,
  };

  let state: WindowState;
  let win: BrowserWindow;

  const restore = (): WindowState => store.get(key, defaultSize);

  const windowWithinBounds = (
    windowState: Required<WindowState>,
    bounds: Rectangle
  ): boolean => {
    return (
      windowState.x >= bounds.x &&
      windowState.y >= bounds.y &&
      windowState.x + windowState.width <= bounds.x + bounds.width &&
      windowState.y + windowState.height <= bounds.y + bounds.height
    );
  };

  const resetToDefaults = (): Required<WindowState> => {
    const bounds = screen.getPrimaryDisplay().bounds;
    const width = defaultSize.width;
    const height = defaultSize.height;
    const x = Math.round((bounds.width - width) / 2);
    const y = Math.round((bounds.height - height) / 2);
    return { x, y, width, height };
  };

  const ensureVisibleOnSomeDisplay = (
    windowState: WindowState
  ): Required<WindowState> => {
    if (
      typeof windowState.x !== "number" ||
      typeof windowState.y !== "number"
    ) {
      return resetToDefaults();
    }
    const visible = screen.getAllDisplays().some((display) => {
      return windowWithinBounds(
        windowState as Required<WindowState>,
        display.bounds
      );
    });
    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetToDefaults();
    }
    return windowState as Required<WindowState>;
  };

  const saveState = (): void => {
    if (!win.isMinimized() && !win.isMaximized()) {
      Object.assign(state, getCurrentPosition());
    }
    store.set(key, state);
  };

  const getCurrentPosition = (): Required<WindowState> => {
    const position = win.getPosition();
    const size = win.getSize();
    return {
      x: position[0],
      y: position[1],
      width: size[0],
      height: size[1],
    };
  };

  state = ensureVisibleOnSomeDisplay(restore());

  win = new BrowserWindow({
    ...state,
    ...options,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...options.webPreferences,
    },
  });

  win.on("close", saveState);

  return win;
};
