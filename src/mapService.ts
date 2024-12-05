// mapService module provided by Brace during D3.e
// https://chat.brace.tools/c/251d9b8f-6006-4702-a0c6-27a1f6389d39

import leaflet from "leaflet";
import { PlayerController } from "./playerController.ts";

export class MapService {
  private map: leaflet.Map;
  private playerIcon: leaflet.Marker;
  private polyLine?: leaflet.Polyline;
  private GAMEPLAY_ZOOM_LEVEL: number;

  constructor(mapElementId: string, playerController: PlayerController) {
    this.GAMEPLAY_ZOOM_LEVEL = 18.75;
    this.map = leaflet.map(document.getElementById(mapElementId)!, {
      center: playerController.getLocation(),
      zoom: this.GAMEPLAY_ZOOM_LEVEL,
      minZoom: this.GAMEPLAY_ZOOM_LEVEL,
      maxZoom: this.GAMEPLAY_ZOOM_LEVEL,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    this.initTileLayer();

    this.playerIcon = leaflet.marker(playerController.getLocation());
    this.playerIcon.addTo(this.map);
    this.updatePlayerPopup({ location: playerController.getLocation });
  }

  initTileLayer() {
    leaflet
      .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
      .addTo(this.map);
  }

  updatePlayer(
    playerLocation: leaflet.LatLng,
    moveHistory: leaflet.LatLng[],
  ) {
    this.playerIcon.setLatLng(playerLocation);
    this.map.panTo(playerLocation);
    this.updatePlayerPopup({ location: playerLocation });

    // draw player movement path
    if (this.polyLine) {
      this.map.removeLayer(this.polyLine);
    }
    this.polyLine = leaflet.polyline(moveHistory, { color: "red " }).addTo(
      this.map,
    );
  }

  private updatePlayerPopup(info: { location: leaflet.LatLng }) {
    this.playerIcon.bindPopup(
      `Location: ${Math.round(info.location.lat * 1e4)}, ${
        Math.round(info.location.lng * 1e4)
      }`,
    );
  }

  getMap(): leaflet.Map {
    return this.map;
  }

  clearPolyline(): void {
    if (this.polyLine) {
      this.map.removeLayer(this.polyLine);
    }
  }
}
