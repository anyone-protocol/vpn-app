// src/main/utils.ts
import { Notification, nativeImage } from "electron";
import fs from "fs";
import path from "path";

export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}


export interface FingerPrintData {
  hexID: string;
  coordinates: {longitude: number, latitude: number};
}

export function getFingerPrintData(): Promise<Map<string, FingerPrintData> | null> {
  // https://api.ec.anyone.tech/fingerprint-map
  //example response
  // {"001EFD3AAF2B651A08C7E04EBA4173F7CCC8B7F2": {
  //   "hexId": "841f857ffffffff",
  //   "coordinates": [48.588578255257, 7.74364013098359]
  // }}
  return new Promise((resolve) => {
    const url = "https://api.ec.anyone.tech/fingerprint-map";
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

          resolve(fingerprintMap);
        } catch (error) {
          throw new Error("Error parsing fingerprint data");
        }
      });
    });

    req.on("error", (error: any) => {
      console.error("Error fetching fingerprint data:", error);
      throw new Error("Error fetching fingerprint data");
    });

    req.end();
  });
}

export function checkIP(useProxy: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const url = "https://api.ipify.org?format=json";
    const options: any = {
      method: "GET",
    };

    if (useProxy) {
      const HttpsProxyAgent = require("https-proxy-agent");
      options.agent = new HttpsProxyAgent("http://127.0.0.1:8118");
    }

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
