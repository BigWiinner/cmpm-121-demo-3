import leaflet from "leaflet";

import { Cache, Coin } from "./objects.ts";

export function savePlayerLocation(playerLocation: leaflet.LatLng): void {
  localStorage.setItem("playerLocation", JSON.stringify(playerLocation));
}
export function loadPlayerLocation(): leaflet.LatLng | null {
  const location = localStorage.getItem("playerLocation");
  if (location) {
    return leaflet.latLng(JSON.parse(location));
  }
  return null;
}

export function saveInventory(playerInventory: Cache): void {
  localStorage.setItem("inventory", JSON.stringify(playerInventory.coins));
}
export function loadInventory(): Coin[] | null {
  const inventory = localStorage.getItem("inventory");
  if (inventory) {
    return JSON.parse(inventory);
  }
  return null;
}

// saveCaches and loadCaches functions provided by Brace when given the prompt:
// "How should I go about saving the spawned caches into localstorage?"
// https://chat.brace.tools/c/57469e1e-69d0-4921-9f69-7d286d2f67e2
export function saveCaches(cacheMomentos: Map<string, string>): void {
  const cacheObject: Record<string, string> = {};
  cacheMomentos.forEach((momento, cellKey) => {
    cacheObject[cellKey] = momento; // Flatten Map into Object
  });
  localStorage.setItem("cacheMomentos", JSON.stringify(cacheObject));
}
export function loadCaches(cacheMomentos: Map<string, string>): void {
  const cacheData = localStorage.getItem("cacheMomentos");
  if (cacheData) {
    const cacheObject: Record<string, string> = JSON.parse(cacheData);
    for (const cellKey in cacheObject) {
      const momentoString = cacheObject[cellKey];
      cacheMomentos.set(cellKey, momentoString);
    }
  }
}
