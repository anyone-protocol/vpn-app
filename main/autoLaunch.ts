// main/autoLaunch.ts
import { app } from "electron";
import AutoLaunch from "auto-launch";

const appAutoLauncher = new AutoLaunch({
  name: "VPN-Anyone App",
  path: app.getPath("exe"),
  isHidden: false,
});

export async function setAutoLaunch(enable: boolean): Promise<void> {
  if (enable) {
    await appAutoLauncher.enable();
  } else {
    await appAutoLauncher.disable();
  }
}

export async function isAutoLaunchEnabled(): Promise<boolean> {
  return await appAutoLauncher.isEnabled();
}
