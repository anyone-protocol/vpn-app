// src/main/systemProxy.ts
import { exec } from "child_process";

export function setProxySettings(enable: boolean, proxyPort: number) {
  const platform = process.platform;
  const proxyAddress = `127.0.0.1:${proxyPort}`;

  if (platform === "win32") {
    const registryPath = `"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"`;

    if (enable) {
      exec(`reg add ${registryPath} /v ProxyEnable /t REG_DWORD /d 1 /f`);
      exec(
        `reg add ${registryPath} /v ProxyServer /t REG_SZ /d "socks=${proxyAddress}" /f`
      );
      console.log("Proxy has been enabled.");
    } else {
      exec(`reg add ${registryPath} /v ProxyEnable /t REG_DWORD /d 0 /f`);
      exec(`reg delete ${registryPath} /v ProxyServer /f`);
      console.log("Proxy has been disabled.");
    }
  } else if (platform === "darwin") {
    const networkInterface = "Wi-Fi";

    if (enable) {
      exec(`networksetup -setsocksfirewallproxy "${networkInterface}" 127.0.0.1 ${proxyPort}`);
      exec(`networksetup -setsocksfirewallproxystate "${networkInterface}" on`);
      console.log("Proxy has been enabled.");
    } else {
      exec(`networksetup -setsocksfirewallproxystate "${networkInterface}" off`);
      console.log("Proxy has been disabled.");
    }
  } else if (platform === "linux") {
    if (enable) {
      exec("gsettings set org.gnome.system.proxy mode 'manual'");
      exec(`gsettings set org.gnome.system.proxy.socks host '127.0.0.1'`);
      exec(`gsettings set org.gnome.system.proxy.socks port ${proxyPort}`);
    } else {
      exec("gsettings set org.gnome.system.proxy mode 'auto'");
      exec("gsettings reset org.gnome.system.proxy.socks host");
      exec("gsettings reset org.gnome.system.proxy.socks port");
    }

    console.log("Proxy settings adjustment not fully implemented for Linux.");
  }
}
