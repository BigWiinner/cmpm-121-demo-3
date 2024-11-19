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
import { Board, Cell } from "./board.ts";

// use cell and serial to make serial number at caches
interface Coin {
  cell: Cell;
  serial: string;
}

// generate coins with unique serial values
interface Cache {
  coins: Coin[];
  geoCache: Geocache | undefined;
}

// use memento to save cache states
interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Geocache implements Momento<string> {
  i: number;
  j: number;
  serials: string[];
  constructor(i: number, j: number, serials: string[]) {
    this.i = i;
    this.j = j;
    this.serials = serials;
  }
  toMomento(): string {
    return JSON.stringify({ i: this.i, j: this.j, serials: this.serials });
  }

  fromMomento(momento: string): void {
    const fromState = JSON.parse(momento);
    this.i = fromState.i;
    this.j = fromState.j;
    this.serials = fromState.serials;
  }
}

// CMPM 121 lecture hall, used for the center of the map
const OAKES_CLASSROOM = leaflet.latLng(36.9896, -122.0627);

// Tunable parameters
const GAMEPLAY_ZOOM_LEVEL = 18.75;
const TILE_CELL_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const CELL_BLOCKS = 8;

// Generate map object
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

// Generate tilemap layer for map.
// This is the map visible to the user
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// create the player's inventory and display it as blank at
// the bottom of the screen
const playerInventory: Cache = {
  coins: [],
  geoCache: undefined,
};
const inventoryDisplay = document.getElementById("inventory")!;
inventoryDisplay.innerHTML = `Inventory:<br>`;

// spawn player at a predetermined spot.
// player controls to be implemented in D3.c
let playerLocation = leaflet.latLng(OAKES_CLASSROOM.lat, OAKES_CLASSROOM.lng);
const playerIcon = leaflet.marker(playerLocation);
playerIcon.addTo(map);
playerIcon.bindPopup(
  `Location: ${Math.round(playerLocation.lat * 1e4)}, 
  ${Math.round(playerLocation.lng * 1e4)}`,
);

// creates grid for caches to be placed on
const origin = playerLocation;
const grid = new Board(TILE_CELL_SIZE, CELL_BLOCKS);
const cell = grid.getCellForPoint({
  i: Math.floor(origin.lat * 1e4),
  j: Math.floor(origin.lng * 1e4),
});
const surroundingCells = grid.getCellsNearPoint(cell);

const cacheMomentos: Map<string, string> = new Map();
function updateCacheMomentos(rectCell: Cell, rectCache: Cache) {
  cacheMomentos.set(
    `${rectCell.i}${rectCell.j}`,
    rectCache.geoCache!.toMomento(),
  );
}

let rectArr: leaflet.Rectangle[] = [];
function addRectFunctionality(rectCell: Cell, rectCache: Cache) {
  const aBox = grid.getCellBounds(rectCell);

  // create new cache if it does not already exist
  rectArr.push(leaflet.rectangle(aBox, { color: "#483aea", weight: 1 }));
  rectArr[rectArr.length - 1].addTo(map);

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
      container.querySelector<HTMLButtonElement>("#Collect")!.addEventListener(
        "click",
        () => {
          const splicedCoin = rectCache.coins.splice(i, 1)[0];
          rectCache.geoCache?.serials.splice(i, 1);
          updateCacheMomentos(rectCell, rectCache);
          rectInfo.removeChild(container);

          playerInventory.coins.push(splicedCoin);
          inventoryDisplay.innerHTML = `Inventory:<br>`;
          for (let i = 0; i < playerInventory.coins.length; i++) {
            inventoryDisplay.innerHTML += `${playerInventory.coins[i].cell.i}${
              playerInventory.coins[i].cell.j
            }:${playerInventory.coins[i].serial}<br>`;
          }
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
          inventoryDisplay.innerHTML = `Inventory:<br>`;
          for (let i = 0; i < playerInventory.coins.length; i++) {
            inventoryDisplay.innerHTML += `${playerInventory.coins[i].cell.i}${
              playerInventory.coins[i].cell.j
            }:${playerInventory.coins[i].serial}<br>`;
          }
          const container = document.createElement("div");
          container.innerHTML =
            `${popCoin.cell.i}${popCoin.cell.j}:${popCoin.serial} <button id=Collect>Collect</button>`;
          rectInfo.appendChild(container);
          map.closePopup();
        }
      },
    );
    return rectInfo;
  });
  updateCacheMomentos(rectCell, rectCache);
}

// create caches with unique coins
let serialNum = 0;
function spawnNewCache(rectCell: Cell): void {
  const coinCount = Math.floor(
    luck([rectCell.i, rectCell.j, "initialValue"].toString()) * 10,
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

function respawnCache(GeoString: string) {
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
  for (let i = 0; i < surroundingCells.length; i++) {
    if (
      luck(
        [surroundingCells[i].i * 1e-4, surroundingCells[i].j * 1e-4]
          .toString(),
      ) < CACHE_PROBABILITY
    ) {
      const momentoCheck = cacheMomentos.get(
        `${surroundingCells[i].i}${surroundingCells[i].j}`,
      );
      if (momentoCheck) {
        respawnCache(momentoCheck);
      } else {
        spawnNewCache(surroundingCells[i]);
      }
    }
  }
}
determineCacheLocation(surroundingCells);

// create logic for player movement
function playerMove(x: number, y: number) {
  playerLocation = leaflet.latLng(
    playerLocation.lat + x,
    playerLocation.lng + y,
  );
  playerIcon.setLatLng(playerLocation);
  map.panTo(playerLocation);
  playerIcon.bindPopup(
    `Location: ${Math.round(playerLocation.lat * 1e4)}, 
    ${Math.round(playerLocation.lng * 1e4)}`,
  );
  const cell = grid.getCellForPoint({
    i: Math.floor(playerLocation.lat * 1e4),
    j: Math.floor(playerLocation.lng * 1e4),
  });
  const surroundingCells = grid.getCellsNearPoint(cell);
  for (let i = 0; i < rectArr.length; i++) {
    rectArr[i].remove();
  }
  rectArr = [];
  determineCacheLocation(surroundingCells);
}

// providecreate functionality to arrow buttons
document.querySelector<HTMLButtonElement>("#north")!.addEventListener(
  "click",
  () => {
    playerMove(TILE_CELL_SIZE, 0);
  },
);
document.querySelector<HTMLButtonElement>("#south")!.addEventListener(
  "click",
  () => {
    playerMove(-TILE_CELL_SIZE, 0);
  },
);
document.querySelector<HTMLButtonElement>("#west")!.addEventListener(
  "click",
  () => {
    playerMove(0, -TILE_CELL_SIZE);
  },
);
document.querySelector<HTMLButtonElement>("#east")!.addEventListener(
  "click",
  () => {
    playerMove(0, TILE_CELL_SIZE);
  },
);
