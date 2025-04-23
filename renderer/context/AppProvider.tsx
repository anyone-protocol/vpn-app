// src/context/AppProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { FingerPrintData } from "../../main/utils";
import { RelayData } from "../../main/state";
import { ProxyRule } from "../../main/proxy";
interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  countryCode: string;
}

interface AppContextType {
  realIP: string | null;
  proxyIP: string | null;
  realLocation: LocationData | null;
  proxyLocation: LocationData | null;
  relayLocation: LocationData | null;
  proxyRunning: boolean;
  relayLocationData: Map<string, FingerPrintData>;
  connectionTime: number;
  isLoading: boolean;
  groupedProcesses: GroupedProcessInfo[];
  fetchInitialData: () => void;
  handleStartProxy: () => void;
  handleStopProxy: () => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  proxyPort: number;
  anyonePort: number;
  relayData: RelayData | null;
  numberOfRelays: number;
  proxyRules: ProxyRule[];
  handleAddProxyRule: (rule: Omit<ProxyRule, 'id'>) => void;
  handleEditProxyRule: (rule: ProxyRule) => void;
  handleDeleteProxyRule: (ruleId: string) => void;
  windowSize: { width: number; height: number };
  screenSize: { width: number; height: number };
}

interface GroupedProcessInfo {
  processName: string;
  friendlyName: string;
  iconPath: string | null;
  count: number;
  pids: number[];
  remoteAddresses: string[];
  remotePorts: number[];
  protected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [realIP, setRealIP] = useState<string | null>("");
  const [relayData, setRelayData] = useState<RelayData | null>(null);

  const [proxyIP, setProxyIP] = useState<string | null>("-");
  const [realLocation, setRealLocation] = useState<LocationData | null>(null);
  const [proxyLocation, setProxyLocation] = useState<LocationData | null>(null);
  const [relayLocation, setRelayLocation] = useState<LocationData | null>(null);
  const [proxyRunning, setProxyRunning] = useState<boolean>(false);
  const [connectionTime, setConnectionTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null); // To control the timer
  const [groupedProcesses, setGroupedProcesses] = useState<
    GroupedProcessInfo[]
  >([]);
  const [proxyPort, setProxyPort] = useState<number>(8118); // Default proxy port
  const [anyonePort, setAnyonePort] = useState<number>(9050); // Default anyone port
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [relayLocationData, setRelayLocationData] = useState<
    Map<string, FingerPrintData>
  >(new Map());
  const [windowSize, setWindowSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 400,
    height: 700,
  });
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });
  const [proxyRules, setProxyRules] = useState<ProxyRule[]>([]);
  const [numberOfRelays, setNumberOfRelays] = useState<number>(0);

  const windowSizeRef = useRef(windowSize);

  const fetchInitialData = async () => {
    setIsLoading(true);
    // wait 2 seconds to get the data
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (typeof window !== "undefined" && window.ipc) {
      const fetchScreen = await window.ipc.getScreenSize();
      setScreenSize(fetchScreen);

      const proxyState = await window.ipc.isProxyRunning();
      setProxyRunning(proxyState);

      const realIp = await window.ipc.checkIP(false);
      console.log(realIp, "realIp");
      setRealIP(realIp);
      const realLoc = await window.ipc.getGeolocation(realIp);
      setRealLocation(realLoc);


      const proxyRules = await window.ipc.getProxyRules();
      setProxyRules(proxyRules);
      console.log(proxyRules, "proxyRules");

      // proxy is running
      if (proxyState) {
        const proxyIp = await window.ipc.checkIP(true);
        console.log(proxyIp, "proxyIp");
        setProxyIP(proxyIp);
        const proxyLoc = await window.ipc.getGeolocation(proxyIp);
        // add timeout to get location
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setProxyLocation(proxyLoc);
        const port = await window.ipc.getProxyPort();
        setProxyPort(port);
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const anonPort = await window.ipc.getAnonPort();
        setAnyonePort(anonPort);

        const relayData = await window.ipc.getRelayData();
        console.log(relayData, "relayData");
        setRelayData(relayData);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const relayLoc = await window.ipc.getGeolocationByCoords(
          relayData?.coordinates?.latitude,
          relayData?.coordinates?.longitude
        );
        setRelayLocation(relayLoc);

        const numberOfRelays = relayData.numberOfRelays;
        setNumberOfRelays(numberOfRelays);
      }

      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Update the ref whenever windowSize state changes
    windowSizeRef.current = windowSize;
  }, [windowSize]);

  useEffect(() => {
    fetchInitialData();
    if (typeof window !== "undefined" && window.ipc) {
      // Check the real IP address when the component mounts
      window.ipc.checkIP(false).then((ip) => {
        console.log(ip, "realIp");
        setRealIP(ip);
        window.ipc
          .getGeolocation(ip)
          .then((location) => setRealLocation(location));
      });

      // Set up IPC listeners
      const removeProxyStartedListener = window.ipc.onProxyStarted(() => {
        setProxyRunning(true);
        setIsLoading(false);
        // Check IP through the proxy
        window.ipc.checkIP(true).then((ip) => {
          console.log(ip, "proxyIp");
          setProxyIP(ip);
          window.ipc
            .getGeolocation(ip)
            .then((location) => setProxyLocation(location))
            .then(async () => {
              window.ipc.getProxyPort().then((port) => {
                setProxyPort(port);
              });
              await new Promise((resolve) => setTimeout(resolve, 5000));
            });
        });
        // add timeout to get location

        // check relay IP
        window.ipc.getRelayData().then((relayData) => {
          setRelayData(relayData);
          setNumberOfRelays(relayData?.numberOfRelays);
          window.ipc
            .getGeolocationByCoords(
              relayData?.coordinates?.latitude,
              relayData?.coordinates?.longitude
            )
            .then(async (location) => {
              setRelayLocation(location);
              await new Promise((resolve) => setTimeout(resolve, 5000));
            });
        });
      });

      const removeProxychangeListener = window.ipc.onProxyIPChanged((ip) => {
        console.log(ip, "proxyIp");
        setProxyIP(ip);
        window.ipc.getGeolocation(ip).then(async (location) => {
          setProxyLocation(location);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        });
      });

      const removeRealIPListener = window.ipc.onRealIPChanged((ip) => {
        console.log(ip, "realIp");
        setRealIP(ip);
        window.ipc.getGeolocation(ip).then(async (location) => {
          setRealLocation(location);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        });
      });

      const removeWindowSizeListener = window.ipc.onWindowResize(
        (height, width) => {
          // Access the latest windowSize from the ref
          const currentWindowSize = windowSizeRef.current;

          // Clamp to nearest 50
          const newHeight = Math.round(height / 50) * 50;
          const newWidth = Math.round(width / 50) * 50;

          // Only update state if the new values are different from the current ones
          if (
            newHeight !== currentWindowSize.height ||
            newWidth !== currentWindowSize.width
          ) {
            console.log("Updating window size state");
            setWindowSize({ height: newHeight, width: newWidth });
          }
        }
      );

      const removeRelayIPListener = window.ipc.onRelayIPChanged(
        (relayDataNew: RelayData) => {
          console.log(relayData, "relayData");
          setRelayData(relayData);
          window.ipc
            .getGeolocationByCoords(
              relayDataNew?.coordinates?.latitude,
              relayDataNew?.coordinates?.longitude
            )
            .then(async (location) => {
              setRelayLocation(location);
              await new Promise((resolve) => setTimeout(resolve, 5000));
            });
        }
      );

      // proxy port change listener
      const removeProxyPortListener = window.ipc.onProxyPortChanged((port) => {
        setProxyPort(port);
      });

      const removeAnyonePortListener = window.ipc.onAnonPortChanged((port) => {
        setAnyonePort(port);
      });

      const removeProxyStoppedListener = window.ipc.onProxyStopped(() => {
        setProxyRunning(false);
        setIsLoading(false);
        setProxyIP(null);
        setRelayData(null);
        setRelayLocation(null);
        setProxyLocation(null);
        setGroupedProcesses([]);
      });

      const removeProxyErrorListener = window.ipc.onProxyError((message) => {
        setIsLoading(false);
        alert(`Proxy Error: ${message}`);
      });

      // Cleanup function
      return () => {
        removeProxyStartedListener();
        removeProxyStoppedListener();
        removeProxyErrorListener();
        removeProxychangeListener();
        removeRealIPListener();
        removeRelayIPListener();
        removeProxyPortListener();
        removeWindowSizeListener();
        removeAnyonePortListener();
      };
    }
  }, []);

  useEffect(() => {
    if (proxyRunning) {
      setTimer(
        setInterval(() => {
          setConnectionTime((prev) => prev + 1);
        }, 1000)
      );
    } else {
      if (timer) clearInterval(timer);
      setConnectionTime(0);
    }
    return () => {
      if (timer) clearInterval(timer); // Cleanup timer on unmount
    };
  }, [proxyRunning]);

  useEffect(() => {
    if (proxyRunning && window.ipc) {
      // Fetch connected processes initially
      fetchGroupedProcesses(proxyPort);

      // Set up interval to refresh the list every 5 seconds
      const intervalId = setInterval(() => {
        fetchGroupedProcesses(proxyPort);
      }, 5000);

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    } else {
      setGroupedProcesses([]);
    }
  }, [proxyRunning]);

  const fetchGroupedProcesses = async (port: number) => {
    try {
      const processes: GroupedProcessInfo[] =
        await window.ipc.getGroupedConnectedProcesses(port);
      const updatedProcesses = await Promise.all(
        processes.map(async (proc) => {
          if (proc.iconPath) {
            // Fetch the base64 image using IPC
            const base64Image = await window.ipc.getIcon(proc.iconPath);
            return { ...proc, iconPath: base64Image };
          }
          return proc;
        })
      );
      setGroupedProcesses(updatedProcesses);
    } catch (error) {
      console.error("Error fetching grouped processes:", error);
    }
  };

  const handleStartProxy = async () => {
    setIsLoading(true);
    if (!window.ipc) {
      console.error("IPC not available");
      setIsLoading(false);
      return;
    }
    await window.ipc.startProxy();
  };

  const handleStopProxy = async () => {
    setIsLoading(true);
    if (!window.ipc) {
      console.error("IPC not available");
      setIsLoading(false);
      return;
    }
    await window.ipc.stopProxy();
  };

  const handleAddProxyRule = async (rule: Omit<ProxyRule, 'id'>) => {
    setIsLoading(true);
    if (!window.ipc) {
      console.error("IPC not available");
      setIsLoading(false);
      return;
    }
    await window.ipc.addNewProxyRule(rule);
    const proxyRules = await window.ipc.getProxyRules();
    setProxyRules(proxyRules);
    setIsLoading(false);
  };

  const handleEditProxyRule = async (rule: ProxyRule) => {
    setIsLoading(true);
    if (!window.ipc) {
      console.error("IPC not available");
      setIsLoading(false);
      return;
    }
    await window.ipc.editProxyRule(rule);
    const proxyRules = await window.ipc.getProxyRules();
    setProxyRules(proxyRules);
    setIsLoading(false);
  };

  const handleDeleteProxyRule = async (ruleId: string) => {
    setIsLoading(true);
    if (!window.ipc) {
      console.error("IPC not available");
      setIsLoading(false);
      return;
    }
    await window.ipc.deleteProxyRule(ruleId);
    const proxyRules = await window.ipc.getProxyRules();
    setProxyRules(proxyRules);
    setIsLoading(false);
  };

  return (
    <AppContext.Provider
      value={{
        realIP,
        proxyIP,
        relayData,
        numberOfRelays,
        realLocation,
        proxyLocation,
        relayLocation,
        proxyRunning,
        connectionTime,
        isLoading,
        groupedProcesses,
        fetchInitialData,
        handleStartProxy,
        handleStopProxy,
        isExpanded,
        setIsExpanded,
        proxyPort,
        anyonePort,
        relayLocationData,
        windowSize,
        screenSize,
        proxyRules,
        handleAddProxyRule,
        handleEditProxyRule,
        handleDeleteProxyRule,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
