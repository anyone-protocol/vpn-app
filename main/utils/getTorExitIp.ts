const axios = require("axios");

export async function getTorExitIp() {
  try {
    const response = await axios.get("https://check.torproject.org/api/ip");
    const exitIp = response.data.IP;
    console.log("Tor exit node IP:", exitIp);
    return exitIp;
  } catch (error) {
    console.error("Error fetching Tor exit IP:", error);
  }
}
