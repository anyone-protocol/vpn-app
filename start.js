// start.js
const { spawn } = require("child_process");

// Set a custom process name (works for some platforms, especially for development)
process.title = "AnyoneVpn";

// Spawn Nextron with custom electron options
const nextronProcess = spawn("npx", ["nextron", "--electron-options=''"], {
  stdio: "inherit",
  shell: true,
});

// Relay the process exit signal
nextronProcess.on("exit", (code) => process.exit(code));
