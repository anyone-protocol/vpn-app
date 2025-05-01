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

    await createRoutingMap();

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
  let retries = 3;
  let lastError = null;

  while (retries > 0) {
    try {
      const circuits = await state.anonControlClient.circuitStatus();
      // console.log('Raw circuit status in getRelayData:', circuits);
      
      // If we get here, we successfully got the circuit status
      for (const circuit of circuits) {
        const nodes = circuit.relays;
        if (nodes && nodes.length > 0) {
          const fingerprint = nodes[0].fingerprint;
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
            console.log(`Error getting relay info (attempt ${4-retries}/3):`, relayError);
            lastError = relayError;
            retries--;
            if (retries === 0) break;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Try the next circuit
          }
        }
      }
      
      // If we get here, no circuits had relays or we couldn't get relay info
      retries--;
      if (retries === 0) break;
      console.log(`No valid circuits found, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`Error getting circuit status (attempt ${4-retries}/3):`, error);
      lastError = error;
      retries--;
      if (retries === 0) break;
      console.log(`Retrying in 2 seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
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
  //  console.log('Proxy rule config:', proxyRuleConfig);

   const routingMap: Record<string, number> = {};

   exits = exits.filter((exit) => {
       return !exit.flags.includes(Flag.BadExit);
   });

   console.log('Exits all:', exits.length);

   // populate country field
    // Retry mechanism for GeoIP data
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
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
    }

   console.log('Guards:', guards.length);

   for (const route of state.proxyRuleConfig.routings) {
    
       const exitsByCountry = exits.filter((exit) => {
           return route.exitCountries.some((country) => exit.country.toLowerCase() === country.toLowerCase());
       });

       console.log('Found exits by country:', exitsByCountry.length);

       const exit = exitsByCountry[Math.floor(Math.random() * exitsByCountry.length)];
      //  console.log('Exit:', exit);
       const guard = guards[Math.floor(Math.random() * guards.length)];
      //  console.log('Guard:', guard);
       const path = [guard.fingerprint, exit.fingerprint];
      //  console.log('Path:', path);

       const options: ExtendCircuitOptions = {
           circuitId: 0,
           serverSpecs: path,
           purpose: "general",
           awaitBuild: true
       };

       const circuitId = await state.anonControlClient.extendCircuit(options);
       const circ = await state.anonControlClient.getCircuit(circuitId);
      //  console.log('Circuit:', circ);
       routingMap[route.targetAddress] = circuitId;
       console.log('Routing map:', routingMap);
   }

   state.routingMap = routingMap;

   await state.anonControlClient.disableStreamAttachment();

   const eventListener = async (event: StreamEvent) => {
    //  console.log('Event:', event);
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
                    // console.log('Raw circuit status response:', circuits);
                    
                    if (!circuits || circuits.length === 0) {
                        throw new Error('No circuits found in response');
                    }
                    
                    success = true;
                } catch (error) {
                    console.log(`Error getting circuit status (attempt ${4-retries}/3):`, error.message);
                    if (error.message.includes('Failed to get relay address')) {
                        // If we got circuit status but failed to get relay info, we can still proceed
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
            
            // console.log('Circuits:', circuits);
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

   // Store the remove function in state, automatic cleanup
   await state.anonControlClient.addEventListener(
     eventListener, 
     EventType.STREAM
   );
  
}
