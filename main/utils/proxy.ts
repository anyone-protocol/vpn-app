import * as ProxyChain from "proxy-chain";

import * as net from "net";
import { state } from "../state";
let proxyServer: ProxyChain.Server | null = null;
let downloadData = 0; // To track download (incoming data)
let uploadData = 0; // To track upload (outgoing data)
const defaultPort = state.proxyPort;
const maxRetries = 3;
function updateProxyStats() {
  if (global.mainWindow) {
    global.mainWindow.webContents.send("proxy-stats", {
      download: formatBytes(downloadData),
      upload: formatBytes(uploadData),
    });
  }
}

// Function to format bytes to KB, MB, GB, etc.
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(false); // Port is in use
      } else {
        reject(err); // Unexpected error
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true); // Port is free
    });

    server.listen(port);
  });
}

// Function to get an available port
export async function getAvailablePort(
  preferredPort: number,
  retries = maxRetries
): Promise<number> {
  let port = preferredPort;
  let isFree;
  for (let i = 0; i <= retries; i++) {
    try {
      isFree = await isPortFree(port);
    } catch (error) {
      console.error(`Error checking port ${port}:`, error);
      isFree = false;
    }
    console.log(`Port ${port} is ${isFree ? "free" : "in use"}`);
    if (isFree) {
      return port; // Return the first available port
    }
    // Generate a random port between 10000 and 65000 if preferredPort is unavailable
    port = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
  }

  throw new Error("No available ports after retries");
}

// Function to start the proxy
export async function startProxy(anonPort: number): Promise<number> {
  if (proxyServer) {
    console.log("Proxy is already running.");
    return;
  }

  try {
    // Check for available port

    const port = await getAvailablePort(defaultPort);

    // Start the proxy-chain server
    proxyServer = new ProxyChain.Server({
      port: port, // HTTP proxy port
      prepareRequestFunction: (requestInfo) => {
        const responseDataHandler = (data: Buffer) => {
          downloadData += data.length; // Count download data (incoming)
          updateProxyStats();
        };

        const requestDataHandler = (data: Buffer) => {
          uploadData += data.length; // Count upload data (outgoing)
          updateProxyStats();
        };

        // Listen to data from the request and response streams
        requestInfo.request.on("data", requestDataHandler);
        requestInfo.request.on("response", responseDataHandler);

        // Forward all requests to the SOCKS proxy
        return {
          upstreamProxyUrl: `socks5://127.0.0.1:${anonPort}`,
        };
      },
    });

    await proxyServer.listen();
    console.log(`Proxy-chain started on port ${port}.`);
    return port;
  } catch (error) {
    console.error("Error starting proxy-chain:", error);
    throw error;
  }
}

// Function to stop the proxy
export async function stopProxy(): Promise<void> {
  if (!proxyServer) {
    console.log("Proxy is not running.");
    return;
  }

  try {
    await proxyServer.close(true);
    proxyServer = null;
    console.log("Proxy-chain stopped.");
  } catch (error) {
    console.error("Error stopping proxy-chain:", error);
    throw error;
  }
}
