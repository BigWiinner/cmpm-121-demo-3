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

import { Cache, Cell, Coin, Geocache } from "./objects.ts";

import {
  loadCaches,
  loadInventory,
  saveCaches,
  saveInventory,
} from "./storage.ts";

import { PlayerController } from "./playerController.ts";
import { MapService } from "./mapService.ts";

// CMPM 121 lecture hall, used for the center of the map
const OAKES_CLASSROOM = leaflet.latLng(36.9896, -122.0627);

// Tunable parameters
const TILE_CELL_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const CELL_BLOCKS = 8;
const MAX_COINS = 5;

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

function handleMovement(x: number, y: number) {
  playerController.step(x, y);
  mapService.updatePlayer(
    playerController.getLocation(),
    playerController.getMoveHistory(),
  );
  centerGrid();
}

// create the player's inventory and display it as blank at
// the bottom of the screen
const playerInventory: Cache = {
  coins: loadInventory() || [],
  geoCache: undefined,
};

const inventoryDisplay = document.getElementById("inventory")!;
updateInventoryDisplay();

function updateInventoryDisplay(): void {
  inventoryDisplay.innerHTML = `Inventory:<br>`;
  for (let i = 0; i < playerInventory.coins.length; i++) {
    inventoryDisplay.innerHTML += `${playerInventory.coins[i].cell.i}${
      playerInventory.coins[i].cell.j
    }:${playerInventory.coins[i].serial}<br>`;
  }
}

// creates grid for caches to be placed on
const grid = new Board(TILE_CELL_SIZE, CELL_BLOCKS);

const cacheMomentos: Map<string, string> = new Map();
function updateCacheMomentos(rectCell: Cell, rectCache: Cache) {
  cacheMomentos.set(
    `${rectCell.i}${rectCell.j}`,
    rectCache.geoCache!.toMomento(),
  );
  saveCaches(cacheMomentos);
}

let rectArr: leaflet.Rectangle[] = [];
function addRectFunctionality(rectCell: Cell, rectCache: Cache) {
  const aBox = grid.getCellBounds(rectCell);

  // create new cache if it does not already exist
  rectArr.push(leaflet.rectangle(aBox, { color: "#483aea", weight: 1 }));
  rectArr[rectArr.length - 1].addTo(mapService.getMap());

  // show coins at cache
  rectArr[rectArr.length - 1].bindPopup((): HTMLDivElement => {
    const rectInfo = document.createElement("div");
    rectInfo.innerHTML = `<div>Location:${Math.round(rectCell.i)}, ${
      Math.round(rectCell.j)
    }</div><button id=Deposit>Deposit</button><br>`;
    for (let i = 0; i < rectCache.coins.length; i++) {
      const container = document.createElement("div");

      const serialString = `${rectCache.coins[i].cell.i}${
        rectCache.coins[i].cell.j
      }:${rectCache.coins[i].serial}`;

      container.innerHTML =
        `${serialString} <button id=Collect>Collect</button>`;

      // lets player collect coins from cache
      container.querySelector<HTMLButtonElement>("#Collect")!
        .addEventListener(
          "click",
          () => {
            const splicedCoin = rectCache.coins.splice(i, 1)[0];
            rectCache.geoCache?.serials.splice(i, 1);
            updateCacheMomentos(rectCell, rectCache);
            rectInfo.removeChild(container);

            playerInventory.coins.push(splicedCoin);
            saveInventory(playerInventory);
            updateInventoryDisplay();
          },
        );

      rectInfo.appendChild(container);
    }

    // lets player deposit coin into cache
    rectInfo.querySelector<HTMLButtonElement>("#Deposit")!.addEventListener(
      "click",
      () => {
        if (playerInventory.coins.length) {
          const popCoin = playerInventory.coins.pop()!;
          rectCache.coins.push(popCoin);
          rectCache.geoCache?.serials.push(`${popCoin.serial}`);
          updateCacheMomentos(rectCell, rectCache);
          updateInventoryDisplay();
          const container = document.createElement("div");
          container.innerHTML =
            `${popCoin.cell.i}${popCoin.cell.j}:${popCoin.serial} <button id=Collect>Collect</button>`;
          rectInfo.appendChild(container);
          mapService.getMap().closePopup();
        }
      },
    );
    return rectInfo;
  });
  updateCacheMomentos(rectCell, rectCache);
}

function centerGrid(): void {
  const location = playerController.getLocation();
  const cell = grid.getCellForPoint({
    i: Math.floor(location.lat * 1e4),
    j: Math.floor(location.lng * 1e4),
  });
  const surroundingCells = grid.getCellsNearPoint(cell);
  rectArr.forEach((rect) => rect.remove());
  rectArr = [];
  determineCacheLocation(surroundingCells);
}

// create caches with unique coins
let serialNum = 0;
function spawnNewCache(rectCell: Cell): void {
  const coinCount = Math.floor(
    luck([rectCell.i, rectCell.j, "initialValue"].toString()) * (MAX_COINS + 1),
  );

  const serialList: string[] = [];
  const rectCache: Cache = {
    coins: [],
    geoCache: new Geocache(rectCell.i, rectCell.j, serialList),
  };

  for (let i = 0; i < coinCount; i++) {
    const coinIdentity: Coin = { cell: rectCell, serial: `${serialNum}` };
    serialNum++;
    rectCache.coins.push(coinIdentity);
    rectCache.geoCache?.serials.push(
      `${rectCache.coins[i].serial}`,
    );
    updateCacheMomentos(rectCell, rectCache);
  }
  addRectFunctionality(rectCell, rectCache);
}

export function respawnCache(GeoString: string) {
  const cacheData = new Geocache(0, 0, [""]);
  cacheData.fromMomento(GeoString);
  const cell: Cell = { i: cacheData.i, j: cacheData.j };
  const rectCache: Cache = {
    coins: [],
    geoCache: cacheData,
  };
  for (let i = 0; i < cacheData.serials.length; i++) {
    const rebuiltCoin: Coin = { cell: cell, serial: cacheData.serials[i] };
    rectCache.coins.push(rebuiltCoin);
  }

  addRectFunctionality(cell, rectCache);
}

// deterministic selection of which spots on the grid to put caches at
function determineCacheLocation(surroundingCells: Cell[]): void {
  for (const cell of surroundingCells) {
    if (luck([cell.i * 1e-4, cell.j * 1e-4].toString()) < CACHE_PROBABILITY) {
      const momentoCheck = cacheMomentos.get(
        `${cell.i}${cell.j}`,
      );
      if (momentoCheck) {
        respawnCache(momentoCheck);
      } else {
        spawnNewCache(cell);
      }
    }
  }
}
loadCaches(cacheMomentos);
centerGrid();

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
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    } else {
      watchId = navigator.geolocation.watchPosition((position) => {
        playerController.move(leaflet.latLng(
          position.coords.latitude,
          position.coords.longitude,
        ));
        console.log(playerController.getLocation());
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
      playerController.move(OAKES_CLASSROOM);

      mapService.updatePlayer(
        playerController.getLocation(),
        playerController.getMoveHistory(),
      );
      mapService.clearPolyline();

      cacheMomentos.clear();
      localStorage.removeItem("cacheMomentos");
      rectArr.forEach((rect) => rect.remove());
      rectArr = [];

      serialNum = 0;
      playerInventory.coins = [];
      updateInventoryDisplay();
      localStorage.removeItem("inventory");

      localStorage.removeItem("playerLocation");
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      centerGrid();
    }
  },
);
