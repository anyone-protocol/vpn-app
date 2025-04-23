// src/main/proxy.ts
import {
  Process,
  Socks,
  Control,
} from "@anyone-protocol/anyone-client";
import {
  startProxy as startPrivoxy,
  stopProxy as stopPrivoxy,
} from "./utils/proxy";
import { setProxySettings } from "./systemProxy";
import { state } from "./state";
import { checkIP, showNotification } from "./utils";
import { getAvailablePort } from "./utils/proxy";
import { ipcMain } from "electron";
import { getFingerPrintData } from "./utils";
import { RelayData } from "./state";

export interface ProxyRule {
    id: string;
    title: string;
    destinations: string[];
    hops: number;
    entryCountries: string[];
    exitCountries: string[];
}

export async function startAnyoneProxy() {
  if (state.anon) {
    console.log("Anyone proxy is already running.");
    return;
  }

  try {
    const fingerprintData = await getFingerPrintData();
    state.fingerprintData = fingerprintData;
  } catch (error) {
    console.error("Error getting fingerprint to geo list:", error);
    state.mainWindow?.webContents.send(
      "proxy-error",
      `Error getting fingerprint list: ${error.message}`
    );
    state?.tray?.window?.webContents.send(
      "proxy-error",
      `Error getting fingerprint list: ${error.message}`
    );
  }

  try {
    const exePath = state.exePath;
    // const anonPort = await state.anonPort;
    // const anonControlPort = state.anonControlPort;
    // state.anonPort = anonPort;
    // state.anonControlPort = anonControlPort;

    console.log("connecting with anyone port: ", state.anonPort);

    state.anon = new Process({
      displayLog: true,
      // socksPort: state.anonPort,
      // controlPort: state.anonControlPort,
      binaryPath: exePath,
      autoTermsAgreement: true,
    });

    state.anonPort = state.anon.getSOCKSPort();
    state.anonControlPort = state.anon.getControlPort();

    state.anonSocksClient = new Socks(state.anon);

    await state.anon.start();
    console.log("Anyone proxy started.");

    state.proxyPort = await startPrivoxy(state.anonPort);

    setProxySettings(true, state.proxyPort);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      state.anonControlClient = new Control();
    } catch (error: any) {
      console.error("Error creating Anyone control client:", error);
      state.mainWindow?.webContents.send(
        "proxy-error",
        `Error creating control client: ${error.message}`
      );
      state.tray?.window?.webContents.send(
        "proxy-error",
        `Error creating control client: ${error.message}`
      );
    }
    await state.anonControlClient.authenticate();

    const socksIp = await checkIP(true);
    state.proxyIp = socksIp;
    ipcMain.emit("proxy:stateChanged", socksIp);
    const relayData = await getRelayData();
    state.relayIp = relayData.ip;
    state.relayData = relayData;
    state.numberOfRelays = relayData.numberOfRelays;

    state.mainWindow?.webContents.send("proxy-started");
    state.tray?.window?.webContents.send("proxy-started");
    state.isProxyRunning = true;
    showNotification(
      "Proxy Started",
      "Your system is now using the Anyone proxy."
    );
    // ipcmain send even proxy:stateChanged
    ipcMain.emit("proxy:stateChanged", true, true);
  } catch (error: any) {
    console.log("Error starting Anyone proxy:", error);
    state.mainWindow?.webContents.send(
      "proxy-error",
      `Error starting proxy: ${error.message}`
    );
    state.tray?.window?.webContents.send(
      "proxy-error",
      `Error starting proxy: ${error.message}`
    );
    state.anon = null;
    state.anonSocksClient = null;
    await stopPrivoxy();
    setProxySettings(false, state.proxyPort);
    showNotification("Proxy Error", `Failed to start proxy: ${error.message}`);
  }
}

export async function getRelayData() {
  try {
    const circuits = await state.anonControlClient.circuitStatus();
    for (const circuit of circuits) {
      const nodes = circuit.relays;
      if (nodes.length > 0) {
        const fingerprint = nodes[0].fingerprint;
        const relayInfo = await state.anonControlClient.getRelayInfo(
          fingerprint
        );
        const nickname = relayInfo.nickname;
        const ip = relayInfo.ip;
        const locationData = state.fingerprintData.get(fingerprint);
        return {
          ip,
          fingerprint,
          nickname,
          coordinates: locationData?.coordinates,
          hexId: locationData?.hexID,
          numberOfRelays: circuits.length,
        } as RelayData;
      }
    }
  } catch (error: any) {
    console.log("Error getting relay data:", error);
    state.mainWindow?.webContents.send(
      "proxy-error",
      `Error getting relay data: ${error.message}`
    );
    state.tray?.window?.webContents.send(
      "proxy-error",
      `Error getting relay data: ${error.message}`
    );
  }
}

export async function stopAnyoneProxy() {
  if (!state.anon) {
    console.log("Anyone proxy is not running.");
    return;
  }
  setProxySettings(false, state.proxyPort);
  if (state.anonControlClient) {
    state.anonControlClient.end();
  }

  try {
    await state.anon.stop();
    console.log("Anyone proxy stopped.");

    await stopPrivoxy();

    state.isProxyRunning = false;
    state.relayIp = "-";
    state.relayData = null;

    state.mainWindow?.webContents.send("proxy-stopped");
    state.tray?.window?.webContents.send("proxy-stopped");
    ipcMain.emit("proxy:stateChanged", false, false);
  } catch (error: any) {
    console.log("Error stopping Anyone proxy:", error);
    state.mainWindow?.webContents.send(
      "proxy-error",
      `Error stopping proxy: ${error.message}`
    );
    state.tray?.window?.webContents.send(
      "proxy-error",
      `Error stopping proxy: ${error.message}`
    );
  } finally {
    state.anon = null;
    state.anonSocksClient = null;
  }
}
// export async function addNewProxyRule(rule: string) {
  
// }