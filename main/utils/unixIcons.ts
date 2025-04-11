import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { nativeImage } from "electron";

const execAsync = promisify(exec);

export async function getProcessIconPathUnix(
  pid: string
): Promise<string | null> {
  try {
    // Use AppleScript to get the application file path
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to get the file of the first process whose unix id is ${pid}'`
    );

    let appPath = stdout.trim();

    // Remove 'alias ' prefix if present
    if (appPath.startsWith("alias ")) {
      appPath = appPath.substring(6);
    }

    // Decode URL encoding (spaces are represented as %20)
    appPath = decodeURI(appPath.replace("file ", "").trim());

    // The icon is usually at 'AppName.app/Contents/Resources/AppIcon.icns'
    const iconPath = path.join(
      appPath,
      "Contents",
      "Resources",
      "AppIcon.icns"
    );

    // Check if the icon file exists
    if (fs.existsSync(iconPath)) {
      return iconPath;
    } else {
      // Alternatively, find any '.icns' file in the Resources folder
      const resourcesPath = path.join(appPath, "Contents", "Resources");
      if (fs.existsSync(resourcesPath)) {
        const files = fs.readdirSync(resourcesPath);
        const icnsFile = files.find((file) => file.endsWith(".icns"));
        if (icnsFile) {
          return path.join(resourcesPath, icnsFile);
        }
      }
      return null;
    }
  } catch (error) {
    console.error(`Failed to get icon for PID ${pid}: ${error}`);
    return null;
  }
}

export async function getProcessIconLinux(
  pid: string
): Promise<unknown | null> {
  try {
    // Get the executable path
    const exePath = await fs.promises.readlink(`/proc/${pid}/exe`);
    const exeName = path.basename(exePath);

    // Search for the icon in common directories
    const iconPaths = await findIconPaths(exeName);

    if (iconPaths.length > 0) {
      // Use the first found icon
      const icon = nativeImage.createFromPath(iconPaths[0]);
      return icon;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Failed to get icon for PID ${pid}: ${error}`);
    return null;
  }
}

async function findIconPaths(iconName: string): Promise<string[]> {
  const iconDirs = [
    "/usr/share/icons/hicolor",
    "/usr/share/pixmaps",
    "/usr/share/icons/Adwaita",
    // Add more icon directories if needed
  ];

  const sizes = ["48x48", "64x64", "128x128", "256x256", "scalable"];
  const extensions = ["png", "svg", "xpm"];

  const foundIcons: string[] = [];

  for (const dir of iconDirs) {
    for (const size of sizes) {
      for (const ext of extensions) {
        const iconPath = path.join(dir, size, "apps", `${iconName}.${ext}`);
        if (fs.existsSync(iconPath)) {
          foundIcons.push(iconPath);
        }
      }
    }
  }

  // Check in /usr/share/pixmaps directly
  for (const ext of extensions) {
    const iconPath = path.join("/usr/share/pixmaps", `${iconName}.${ext}`);
    if (fs.existsSync(iconPath)) {
      foundIcons.push(iconPath);
    }
  }

  return foundIcons;
}
