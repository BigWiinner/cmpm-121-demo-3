// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// style sheets
import "./style.css";
import "leaflet/dist/leaflet.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Represents geographic grid
import { Board } from "./board.ts";

import { Cell } from "./objects.ts";
import { GeocacheManager } from "./geocacheManager.ts";
import { GeocacheUIService } from "./geocacheUIService.ts";
import { PlayerController } from "./playerController.ts";
import { MapService } from "./mapService.ts";
import { PlayerInventory } from "./playerInventory.ts";

// CMPM 121 lecture hall, used for the center of the map
const OAKES_CLASSROOM = leaflet.latLng(36.9896, -122.0627);

// Tunable parameters
const TILE_CELL_SIZE = 0.0001;
const CELL_BLOCKS = 8;
const CACHE_PROBABILITY = 0.1;

// spawn player at a predetermined spot.
const initialLocation = leaflet.latLng(
  OAKES_CLASSROOM.lat,
  OAKES_CLASSROOM.lng,
);
const playerController = new PlayerController(initialLocation);
const mapService = new MapService("map", playerController);
mapService.updatePlayer(
  playerController.getLocation(),
  playerController.getMoveHistory(),
);
const grid: Board = new Board(TILE_CELL_SIZE, CELL_BLOCKS);
const geocacheManager = new GeocacheManager();
const inventory = new PlayerInventory();
const geocacheUIService = new GeocacheUIService(
  mapService,
  geocacheManager,
  inventory,
  grid,
);

function handleMovement(x: number, y: number) {
  playerController.step(x, y);
  mapService.updatePlayer(
    playerController.getLocation(),
    playerController.getMoveHistory(),
  );
  centerGrid();
}

function determineCacheLocation(surroundingCells: Cell[]): void {
  for (const cell of surroundingCells) {
    if (luck([cell.i * 1e-4, cell.j * 1e-4].toString()) < CACHE_PROBABILITY) {
      const cacheCheck = geocacheManager.getCache(cell);
      if (!cacheCheck) {
        handleNewCache(cell);
      }
    }
  }
}

function handleNewCache(cell: Cell) {
  const _newCache = geocacheManager.spawnCache(cell);
  geocacheUIService.addRect(cell);
}

let surroundingCells: Cell[];
function centerGrid(): void {
  const location = playerController.getLocation();
  const cell = grid.getCellForPoint({
    i: Math.floor(location.lat * 1e4),
    j: Math.floor(location.lng * 1e4),
  });
  surroundingCells = grid.getCellsNearPoint(cell);
  determineCacheLocation(surroundingCells);
}

const caches = geocacheManager.getAllCaches();

caches.forEach((cache, _cellKey) => {
  const cell: Cell = { i: cache.geoCache!.i, j: cache.geoCache!.j };
  geocacheUIService.addRect(cell); // Add rectangles to the map using the UI service
});

// provide functionality to arrow buttons
document.querySelector<HTMLButtonElement>("#north")!.addEventListener(
  "click",
  () => {
    handleMovement(TILE_CELL_SIZE, 0);
  },
);
document.querySelector<HTMLButtonElement>("#south")!.addEventListener(
  "click",
  () => {
    handleMovement(-TILE_CELL_SIZE, 0);
  },
);
document.querySelector<HTMLButtonElement>("#west")!.addEventListener(
  "click",
  () => {
    handleMovement(0, -TILE_CELL_SIZE);
  },
);
document.querySelector<HTMLButtonElement>("#east")!.addEventListener(
  "click",
  () => {
    handleMovement(0, TILE_CELL_SIZE);
  },
);

// toggles automatic position updating based on the device's geolocation
let watchId: number | null;
document.querySelector<HTMLButtonElement>("#sensor")!.addEventListener(
  "click",
  () => {
    if (watchId) {
      alert("Location tracking is off");
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    } else {
      alert("Location tracking is on");
      watchId = navigator.geolocation.watchPosition((position) => {
        playerController.move(leaflet.latLng(
          position.coords.latitude,
          position.coords.longitude,
        ));
        mapService.updatePlayer(
          playerController.getLocation(),
          playerController.getMoveHistory(),
        );
        centerGrid();
      });
    }
  },
);

// resets program to initial state
document.querySelector<HTMLButtonElement>("#reset")!.addEventListener(
  "click",
  () => {
    const query = prompt(
      "Are you sure you want to reset? Type yes to reset.",
    );
    if (query?.toLowerCase() === "yes") {
      playerController.clearMoveHistory();
      localStorage.removeItem("playerLocation");
      playerController.move(OAKES_CLASSROOM);

      mapService.updatePlayer(
        playerController.getLocation(),
        playerController.getMoveHistory(),
      );
      mapService.clearPolyline();

      geocacheManager.clearCache();
      geocacheUIService.deleteAllRects();
      localStorage.removeItem("cacheMomentos");

      inventory.clearInventory();
      localStorage.removeItem("inventory");

      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      centerGrid();
    }
  },
);
