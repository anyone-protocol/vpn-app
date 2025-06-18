// src/main/utils.ts
import { Notification, nativeImage } from "electron";
import fs from "fs";
import path from "path";
import { state } from "./state";

export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}


export interface FingerPrintData {
  hexID: string;
  coordinates: {longitude: number, latitude: number};
}

export async function getFingerPrintData(): Promise<Map<string, FingerPrintData> | null> {
  const url = "https://api.ec.anyone.tech/fingerprint-ma";
  let lastError: any = null;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Attempt ${attempt}: Error fetching fingerprint data:`, response.statusText);
        lastError = new Error("Error fetching fingerprint data");
        continue;
      }
      const json = await response.json();

      const fingerprintMap = new Map<string, FingerPrintData>();
      for (const [key, value] of Object.entries(json)) {
        const hexID = (value as any).hexId;
        const coordinatesArray = (value as any).coordinates;
        if (Array.isArray(coordinatesArray) && coordinatesArray.length === 2) {
          const coordinates = {
            latitude: coordinatesArray[0],
            longitude: coordinatesArray[1],
          };
          fingerprintMap.set(key, { hexID, coordinates });
        }
      }
      return fingerprintMap;
    } catch (error) {
      console.error(`Attempt ${attempt}: Error fetching or parsing fingerprint data:`, error);
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

export function checkIP(useProxy: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const url = "https://api.ipify.org?format=json";

    if (useProxy) {
      state.anonSocksClient.get(url)
        .then(response => {
          try {
            resolve(response.data.ip);
          } catch (error) {
            console.error("Error parsing IP response:", error);
            resolve(null);
          }
        })
        .catch(error => {
          console.error("Error fetching IP address:", error);
          resolve(null);
        });
    } else {
      const options: any = {
        method: "GET",
      };

      const https = require("https");
      const req = https.request(url, options, (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.ip);
          } catch (error) {
            console.error("Error parsing IP response:", error);
            resolve(null);
          }
        });
      });

      req.on("error", (error: any) => {
        console.error("Error fetching IP address:", error);
        resolve(null);
      });

      req.end();
    }
  });
}

export async function getGeolocation(ip: string) {
  try {
    // First, try fetching from ipwhois.io
    const response = await fetch(`https://ipwhois.app/json/${ip}`);
    if (!response.ok) throw new Error("ipwhois.app failed");

    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country,
      countryCode: data.country_code,
    };
  } catch (error) {
    console.error("Primary API (ipwhois.app) failed:", error);

    // Fallback to ipapi.co if the primary API fails
    try {
      const fallbackResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!fallbackResponse.ok) throw new Error("ipapi.co failed");

      const fallbackData = await fallbackResponse.json();
      return {
        latitude: fallbackData.latitude,
        longitude: fallbackData.longitude,
        city: fallbackData.city,
        region: fallbackData.region,
        country: fallbackData.country_name,
        countryCode: fallbackData.country,
      };
    } catch (fallbackError) {
      console.error("Fallback API (ipapi.co) failed:", fallbackError);
      return null;
    }
  }
}

export async function getGeolocationByCoords(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    if (!response.ok) throw new Error("openstreetmap failed");

    const data = await response.json();

    return {
      latitude: lat,
      longitude: lon,
      city: data.address.city ? data.address.city : data.address.village,
      region: data.address.state,
      country: data.address.country,
      countryCode: data.address.country_code,
    };
  } catch (error) {
    console.error("Error fetching geolocation by coordinates:", error);
    return null;
  }
}

export async function getIcon(iconPath: string) {
  try {
    const imageBuffer = fs.readFileSync(iconPath);
    const base64Data = nativeImage.createFromBuffer(imageBuffer).toDataURL();
    return base64Data;
  } catch (error) {
    console.error(`Error loading icon from ${iconPath}:`, error);
    return null;
  }
}
