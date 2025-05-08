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
import { RelayData, ProxyRuleConfig } from "./state";
import Store  from "electron-store";
import { EventType, ExtendCircuitOptions, Flag, StreamEvent } from "@anyone-protocol/anyone-client/out/models";

const store = new Store();

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
    const termsFilePath = state.termsFilePath;
    // const anonPort = await state.anonPort;
    // const anonControlPort = state.anonControlPort;
    // state.anonPort = anonPort;
    // state.anonControlPort = anonControlPort;

    console.log("connecting with anyone port: ", state.anonPort);

    try {
      if (termsFilePath) {
        state.anon = new Process({
          displayLog: false,
          // socksPort: state.anonPort,
          // controlPort: state.anonControlPort,
          binaryPath: exePath,
          autoTermsAgreement: true,
          termsFilePath: termsFilePath,
        });
      } else {
        state.anon = new Process({
          displayLog: false,
          binaryPath: exePath,
          autoTermsAgreement: true,
        });
      }
    } catch (error) {
      console.error("Error creating Anyone process:", error);
      state.mainWindow?.webContents.send(
        "proxy-error",
        `Error creating Anyone process: ${error.message}`
      );
    }

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

    // await createRoutingMap();

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
  let circuitRetries = 3;
  let relayInfoRetries = 2;
  let lastError = null;

  while (circuitRetries > 0) {
    try {
      const circuits = await state.anonControlClient.circuitStatus();
      console.log('Got circuit status');
      
      // If we get here, we successfully got the circuit status
      for (const circuit of circuits) {
        const nodes = circuit.relays;
        if (nodes && nodes.length > 0) {
          const fingerprint = nodes[0].fingerprint;
          let relayInfoAttempts = relayInfoRetries;
          
          while (relayInfoAttempts > 0) {
            try {
              const relayInfo = await state.anonControlClient.getRelayInfo(fingerprint);
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
            } catch (relayError) {
              console.log(`Error getting relay info (attempt ${relayInfoRetries - relayInfoAttempts + 1}/${relayInfoRetries}):`, relayError);
              lastError = relayError;
              relayInfoAttempts--;
              if (relayInfoAttempts === 0) break;
              // await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
        }
      }
      
      // If we get here, no circuits had relays or we couldn't get relay info
      circuitRetries--;
      if (circuitRetries === 0) break;
      console.log(`No valid circuits found, retrying... (${circuitRetries} attempts left)`);
      // await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`Error getting circuit status (attempt ${4-circuitRetries}/3):`, error);
      lastError = error;
      circuitRetries--;
      if (circuitRetries === 0) break;
      console.log(`Retrying in 2 seconds... (${circuitRetries} attempts left)`);
      // await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log("Failed to get relay data after multiple attempts:", lastError);
  state.mainWindow?.webContents.send(
    "proxy-error",
    `Error getting relay data: ${lastError?.message || 'Unknown error'}`
  );
  state.tray?.window?.webContents.send(
    "proxy-error",
    `Error getting relay data: ${lastError?.message || 'Unknown error'}`
  );
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

async function createRoutingMap() {
  const relays = await state.anonControlClient.getRelays();
  let exits = state.anonControlClient.filterRelaysByFlags(relays, Flag.Exit);
  let guards = state.anonControlClient.filterRelaysByFlags(relays, Flag.Guard);
  let middleRelays = state.anonControlClient.filterRelaysByFlags(relays, Flag.Stable)
    .filter(relay => 
      relay.flags.includes(Flag.Stable) &&
      relay.flags.includes(Flag.Running) &&
      !relay.flags.includes(Flag.Exit) && // not Exit allowed for middle
      !relay.flags.includes(Flag.Guard) // not Guard allowed for middle
    );
  
  // import the routing map from the store
  const proxyRules = store.get('proxyRules', []) as ProxyRule[];
  const proxyRuleConfig = {
    routings: proxyRules.flatMap(rule => 
      rule.destinations.map(destination => ({
        targetAddress: destination,
        hops: rule.hops,
        entryCountries: rule.entryCountries,
        exitCountries: rule.exitCountries,
      }))
    )
  } as ProxyRuleConfig;

  state.proxyRuleConfig = proxyRuleConfig;
  const routingMap: Record<string, number> = {};

  // Filter out bad exits
  exits = exits.filter((exit) => !exit.flags.includes(Flag.BadExit));
  console.log('Available exits:', exits.length);

  // populate country field
  let retries = 3;
  let success = false;
  while (retries > 0 && !success) {
    try {
      await state.anonControlClient.populateCountries(exits);
      success = true;
    } catch (error) {
      console.log(`GeoIP data not loaded, retrying... (${retries} attempts left)`);
      retries--;
      if (retries === 0) {
        throw new Error('Failed to load GeoIP data after multiple attempts');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('Available guards:', guards.length);
  console.log('Available middle relays:', middleRelays.length);

  for (const route of state.proxyRuleConfig.routings) {
    try {
      // Get exit node based on country requirements
      const exitsByCountry = exits.filter((exit) => 
        route.exitCountries.some((country) => exit.country?.toLowerCase() === country.toLowerCase())
      );
      
      if (exitsByCountry.length === 0) {
        console.error(`No exits found for countries: ${route.exitCountries.join(', ')}`);
        continue;
      }

      const exit = exitsByCountry[Math.floor(Math.random() * exitsByCountry.length)];
      
      // // Get entry guard
      // const guardsByCountry = guards.filter((guard) => 
      //   !route.entryCountries.some((country) => guard.country?.toLowerCase() === country.toLowerCase())
      // );
      
      // if (guardsByCountry.length === 0) {
      //   console.error(`No guards found excluding countries: ${route.entryCountries.join(', ')}`);
      //   continue;
      // }

      // const guard = guardsByCountry[Math.floor(Math.random() * guardsByCountry.length)];
      const guard = guards[Math.floor(Math.random() * guards.length)];

      // Create path with middle relays based on hop count
      const path = [guard.fingerprint];
      
      // Add middle relays if needed (hops - 2 because we already have guard and exit)
      for (let i = 0; i < route.hops - 2; i++) {
        const availableMiddleRelays = middleRelays.filter(relay => 
          !path.includes(relay.fingerprint)
        );
        
        if (availableMiddleRelays.length === 0) {
          console.error('No available middle relays for path');
          continue;
        }
        
        const middle = availableMiddleRelays[Math.floor(Math.random() * availableMiddleRelays.length)];
        path.push(middle.fingerprint);
      }
      
      path.push(exit.fingerprint);

      console.log(`Created path for ${route.targetAddress} with ${route.hops} hops:`, path);

      const options: ExtendCircuitOptions = {
        circuitId: 0,
        serverSpecs: path,
        purpose: "general",
        awaitBuild: true
      };

      const circuitId = await state.anonControlClient.extendCircuit(options);
      const circ = await state.anonControlClient.getCircuit(circuitId);
      routingMap[route.targetAddress] = circuitId;
      console.log('Circuit created:', circuitId);
    } catch (error) {
      console.error(`Failed to create circuit for ${route.targetAddress}:`, error);
      continue;
    }
  }

  state.routingMap = routingMap;
  console.log('Final routing map:', routingMap);

  await state.anonControlClient.disableStreamAttachment();

  const eventListener = async (event: StreamEvent) => {
    if (event.status === 'NEW') {
      const targetAddress = event.target.split(':')[0];
      const circuitId = state.routingMap[targetAddress];

      if (circuitId && (event.circId === '0' || event.circId === undefined)) {
        console.log('Attaching stream to circuit in routing map:', circuitId);
        await state.anonControlClient.attachStream(event.streamId, circuitId);
      } else {
        let circuits;
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            circuits = await state.anonControlClient.circuitStatus();
            
            if (!circuits || circuits.length === 0) {
              throw new Error('No circuits found in response');
            }
            
            success = true;
          } catch (error) {
            console.log(`Error getting circuit status (attempt ${4-retries}/3):`, error.message);
            if (error.message.includes('Failed to get relay address')) {
              console.log('Got circuit status but failed to get relay info, proceeding with available data');
              success = true;
            } else {
              retries--;
              if (retries === 0) {
                console.error('Failed to get circuit status after multiple attempts:', error);
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        const openCircuits = circuits.filter(circuit => 
          circuit.state === 'BUILT' && 
          circuit.purpose === 'GENERAL' &&
          circuit.relays.length === 3
        );
        
        if (openCircuits.length > 0) {
          const randomCircuit = openCircuits[Math.floor(Math.random() * openCircuits.length)];
          console.log(`Found ${openCircuits.length} open circuits, randomly selected circuit ${randomCircuit.circuitId}`);
          await state.anonControlClient.attachStream(event.streamId, randomCircuit.circuitId);
        }
      }
    }
  };

  await state.anonControlClient.addEventListener(
    eventListener, 
    EventType.STREAM
  );
}
