// src/main/utils.ts
import { Notification, nativeImage } from "electron";
import fs from "fs";
import { state } from "./state";

export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}


export interface FingerPrintData {
  hexID: string;
  coordinates: {longitude: number, latitude: number};
}

export async function getFingerPrintData(): Promise<Map<string, FingerPrintData> | null> {
  const url = "https://api.ec.anyone.tech/fingerprint-map";
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

export async function checkIP(useProxy: boolean): Promise<string | null> {
  const url = "https://api.ipify.org?format=json";
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (useProxy) {
        try {
          const response = await state.anonSocksClient.get(url);
          if (response.data && response.data.ip) {
            return response.data.ip;
          }
        } catch (error) {
          console.error(`Attempt ${attempt}: Error parsing IP response:`, error);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return null;
        }
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Attempt ${attempt}: Error fetching IP address:`, response.statusText);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return null;
        }
        const data = await response.json();
        if (data && data.ip) {
          return data.ip;
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempt}: Error fetching IP address:`, error);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return null;
      }
    }
  }
  
  return null;
}

export async function getGeolocation(ip: string) {
  try {
    // Try to use SOCKS proxy if available
    if (state.anonSocksClient) {
      try {
        // Use SOCKS proxy for the API call with timeout
        const response = await Promise.race([
          state.anonSocksClient.get(`https://ipwhois.app/json/${ip}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SOCKS timeout')), 5000)
          )
        ]) as any;
        
        if (response && response.data) {
          return {
            latitude: response.data.latitude,
            longitude: response.data.longitude,
            city: response.data.city,
            region: response.data.region,
            country: response.data.country,
            countryCode: response.data.country_code,
          };
        }
      } catch (socksError) {
        console.log("SOCKS proxy geolocation failed, trying direct connection:", socksError.message);
      }
    }

    // Fallback to direct connection
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
      let fallbackResponse;
      
      // Try SOCKS proxy first for fallback
      if (state.anonSocksClient) {
        try {
          fallbackResponse = await Promise.race([
            state.anonSocksClient.get(`https://ipapi.co/${ip}/json/`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SOCKS timeout')), 5000)
            )
          ]) as any;
          
          if (fallbackResponse && fallbackResponse.data) {
            return {
              latitude: fallbackResponse.data.latitude,
              longitude: fallbackResponse.data.longitude,
              city: fallbackResponse.data.city,
              region: fallbackResponse.data.region,
              country: fallbackResponse.data.country_name,
              countryCode: fallbackResponse.data.country,
            };
          }
        } catch (socksError) {
          console.log("SOCKS proxy fallback failed, trying direct connection:", socksError.message);
        }
      }
      
      // Direct connection fallback
      fallbackResponse = await fetch(`https://ipapi.co/${ip}/json/`);
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
      
      // If both APIs fail, return a basic response
      console.log("All geolocation APIs failed - returning basic response");
      return null;
    }
  }
}

export async function getGeolocationByCoords(lat: number, lon: number) {
  try {
    // Try to use SOCKS proxy if available
    if (state.anonSocksClient) {
      try {
        const response = await Promise.race([
          state.anonSocksClient.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SOCKS timeout')), 5000)
          )
        ]) as any;
        
        if (response && response.data) {
          return {
            latitude: lat,
            longitude: lon,
            city: response.data.address.city ? response.data.address.city : response.data.address.village,
            region: response.data.address.state,
            country: response.data.address.country,
            countryCode: response.data.address.country_code,
          };
        }
      } catch (socksError) {
        console.log("SOCKS proxy geolocation by coords failed, trying direct connection:", socksError.message);
      }
    }

    // Fallback to direct connection
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
    
    // If geolocation fails, return a basic response with the coordinates
    console.log("Geolocation by coordinates failed - returning basic response");
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
