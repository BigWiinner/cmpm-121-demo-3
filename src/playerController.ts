// playerController module provided by Brace during D3.e
// https://chat.brace.tools/c/251d9b8f-6006-4702-a0c6-27a1f6389d39

import leaflet from "leaflet";
import { loadPlayerLocation, savePlayerLocation } from "./storage.ts";

export class PlayerController {
  private location: leaflet.latLng;
  private moveHistory: leaflet.LatLng[] = [];

  constructor(initialLocation: leaflet.latLng) {
    this.location = loadPlayerLocation() || initialLocation;
    this.moveHistory.push(this.location);
    savePlayerLocation(this.location);
  }

  step(x: number, y: number) {
    this.location = leaflet.latLng(
      this.location.lat + x,
      this.location.lng + y,
    );
    this.move(this.location);
  }

  move(newLocation: leaflet.LatLng) {
    this.location = newLocation;
    this.moveHistory.push(this.location);
    savePlayerLocation(this.location);
  }

  getLocation(): leaflet.latLng {
    return this.location;
  }

  getMoveHistory(): leaflet.latLng[] {
    return this.moveHistory;
  }

  clearMoveHistory(): void {
    this.moveHistory = [];
  }
}
