export const processIconMap: { [key: string]: string } = {
  code: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg",
  visual:
    "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg",
  "google chrome":
    "https://www.google.com/chrome/static/images/chrome-logo.svg",
  google: "https://www.google.com/chrome/static/images/chrome-logo.svg",
  brave:
    "https://upload.wikimedia.org/wikipedia/commons/5/51/Brave_icon_lionface.png",
  slack:
    "https://cdn.brandfolder.io/5H442O3W/at/pl546j-7le8zk-6gwiyo/Slack_Mark.svg",
  terminal:
    "https://upload.wikimedia.org/wikipedia/commons/5/51/Windows_Terminal_logo.svg",
  finder:
    "https://upload.wikimedia.org/wikipedia/commons/c/c9/Finder_Icon_macOS_Big_Sur.png",
  safari:
    "https://upload.wikimedia.org/wikipedia/commons/8/8d/Safari_2020_logo.svg",
  firefox: "https://cdn.worldvectorlogo.com/logos/firefox.svg",
  "System Preferences":
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/System_Icon.png",
};

/**
 * Normalizes the process name by converting to lowercase and removing unwanted suffixes.
 * @param processName The original process name.
 * @returns The normalized process name.
 */
export function normalizeProcessName(processName: string): string {
  // Convert to lowercase
  let normalized = processName.toLowerCase();
  normalized = normalized.replace(".exe", "");
  normalized = normalized.replace(".app", "");
  normalized = normalized.replace("\x20h", "");
  normalized = normalized.replace("\x20", "");
  normalized = normalized.replace("x20h", "");
  normalized = normalized.replace("x20", "");
  // Remove URL encoding or escape sequences (e.g., /x20h)
  // This regex removes any '/x' followed by hexadecimal characters
  normalized = normalized.replace(/\/x[0-9a-f]{2}/g, "");

  // Remove any remaining non-alphanumeric characters except spaces
  normalized = normalized.replace(/[^a-z0-9 ]/g, "");

  // Trim whitespace
  normalized = normalized.trim();

  return normalized;
}

export function normalizeProcessNameCapital(processName: string): string {
  processName = normalizeProcessName(processName);
  return processName.charAt(0).toUpperCase() + processName.slice(1);
}
