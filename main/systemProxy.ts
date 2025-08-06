// src/main/systemProxy.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function getNetworkInterfaces(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('networksetup -listnetworkserviceorder | grep -B1 "Hardware Port: \\(Wi-Fi\\|.*LAN\\)" | grep "^([0-9*])" | sed \'s/^([0-9*]*) //\'');
    return stdout.trim().split('\n').filter(networkInterface => networkInterface.trim().length > 0);
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    return ['Wi-Fi']; // fallback to Wi-Fi if command fails
  }
}

export async function setProxySettings(enable: boolean, proxyPort: number, dnsProxyPort?: number) {
  const platform = process.platform;
  const proxyAddress = `127.0.0.1:${proxyPort}`;

  if (platform === "win32") {
    const registryPath = `"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"`;

    if (enable) {
      exec(`reg add ${registryPath} /v ProxyEnable /t REG_DWORD /d 1 /f`);
      exec(
        `reg add ${registryPath} /v ProxyServer /t REG_SZ /d "socks=${proxyAddress}" /f`
      );
      
      // Set DNS settings if DNS proxy port is provided
      if (dnsProxyPort) {
        exec(`reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v NameServer /t REG_SZ /d "127.0.0.1" /f`);
        exec(`reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\*" /v NameServer /t REG_SZ /d "127.0.0.1" /f`);
        console.log("DNS settings configured for Windows.");
      }
      
      console.log("Proxy has been enabled.");
    } else {
      exec(`reg add ${registryPath} /v ProxyEnable /t REG_DWORD /d 0 /f`);
      exec(`reg delete ${registryPath} /v ProxyServer /f`);
      
      // Reset DNS settings
      if (dnsProxyPort) {
        exec(`reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v NameServer /f`);
        exec(`reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\*" /v NameServer /f`);
        console.log("DNS settings reset for Windows.");
      }
      
      console.log("Proxy has been disabled.");
    }
  } else if (platform === "darwin") {
    try {
      const networkInterfaces = await getNetworkInterfaces();
      console.log(`Found network interfaces: ${networkInterfaces.join(', ')}`);

      for (const networkInterface of networkInterfaces) {
        if (enable) {
          await execAsync(`networksetup -setsocksfirewallproxy "${networkInterface}" 127.0.0.1 ${proxyPort}`);
          await execAsync(`networksetup -setsocksfirewallproxystate "${networkInterface}" on`);
          
          // Set DNS settings if DNS proxy port is provided
          if (dnsProxyPort) {
            await execAsync(`networksetup -setdnsservers "${networkInterface}" 127.0.0.1`);
            console.log(`DNS settings configured for ${networkInterface}.`);
          }
          
          console.log(`Proxy has been enabled for ${networkInterface}.`);
        } else {
          await execAsync(`networksetup -setsocksfirewallproxystate "${networkInterface}" off`);
          
          // Reset DNS settings
          if (dnsProxyPort) {
            await execAsync(`networksetup -setdnsservers "${networkInterface}" empty`);
            console.log(`DNS settings reset for ${networkInterface}.`);
          }
          
          console.log(`Proxy has been disabled for ${networkInterface}.`);
        }
      }
    } catch (error) {
      console.error('Error setting proxy for network interfaces:', error);
    }
  } else if (platform === "linux") {
    if (enable) {
      exec("gsettings set org.gnome.system.proxy mode 'manual'");
      exec(`gsettings set org.gnome.system.proxy.socks host '127.0.0.1'`);
      exec(`gsettings set org.gnome.system.proxy.socks port ${proxyPort}`);
      
      // Set DNS settings if DNS proxy port is provided
      if (dnsProxyPort) {
        exec("echo 'nameserver 127.0.0.1' | sudo tee /etc/resolv.conf");
        console.log("DNS settings configured for Linux.");
      }
    } else {
      exec("gsettings set org.gnome.system.proxy mode 'auto'");
      exec("gsettings reset org.gnome.system.proxy.socks host");
      exec("gsettings reset org.gnome.system.proxy.socks port");
      
      // Reset DNS settings
      if (dnsProxyPort) {
        exec("sudo systemctl restart systemd-resolved");
        console.log("DNS settings reset for Linux.");
      }
    }

    console.log("Proxy settings adjustment not fully implemented for Linux.");
  }
}
