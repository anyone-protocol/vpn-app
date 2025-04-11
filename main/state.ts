// src/main/state.ts
import { BrowserWindow, Menu, Tray } from "electron";
import {
  Anon,
  AnonSocksClient,
  AnonControlClient,
} from "@anyone-protocol/anyone-client";
import { exePath } from "./constants";
import { FingerPrintData } from "./utils";
import { Menubar } from "menubar";

export interface RelayData {
  fingerprint: string;
  nickname: string;
  ip: string;
  coordinates: { longitude: number; latitude: number };
  hexId: string;
  numberOfRelays: number;
}

export interface FingerprintData {
  hexID: string;
  coordinates: { longitude: number; latitude: number };
}

interface AppState {
  mainWindow: BrowserWindow | null;
  settingsWindow: BrowserWindow | null;
  tray: Menubar;
  isQuitting: boolean;
  isProxyRunning: boolean;
  anon: Anon | null;
  anonSocksClient: AnonSocksClient | null;
  anonControlClient: AnonControlClient | null;
  proxyPort: number;
  anonPort: number;
  anonControlPort: number;
  orPort: number;
  relayIp: string | null;
  realIp: string | null;
  proxyIp: string | null;
  exePath: string;
  relayData: RelayData | null;
  numberOfRelays: number;
  fingerprintData: Map<string, FingerprintData>;
  screenSize: { width: number; height: number };
}

export const state: AppState = {
  mainWindow: null,
  settingsWindow: null,
  tray: null,
  isQuitting: false,
  isProxyRunning: false,
  anon: null,
  anonSocksClient: null,
  anonControlClient: null,
  proxyPort: 8118,
  anonPort: 9050,
  anonControlPort: 9051,
  orPort: 9001,
  relayIp: null,
  realIp: null,
  proxyIp: null,
  exePath: exePath,
  relayData: null,
  numberOfRelays: 0,
  fingerprintData: new Map(),
  screenSize: { width: 0, height: 0 },
};

export async function initializeState() {
  // Fetch real IP on startup
  const { checkIP } = await import("./utils");
  state.realIp = await checkIP(false);

  // Optionally, start other initializations here
}
