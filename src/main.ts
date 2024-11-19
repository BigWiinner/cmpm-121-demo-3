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
const OAKES_CLASSROOM = leaflet.latLng(36.9894, -122.0627);

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

// create logic for player movement
// TODO MAKE INTO FUNCTION
// TOO MUCH REPETITION
document.querySelector<HTMLButtonElement>("#north")!.addEventListener(
  "click",
  () => {
    playerLocation = leaflet.latLng(
      playerLocation.lat + TILE_CELL_SIZE,
      playerLocation.lng,
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
  },
);
document.querySelector<HTMLButtonElement>("#south")!.addEventListener(
  "click",
  () => {
    playerLocation = leaflet.latLng(
      playerLocation.lat - TILE_CELL_SIZE,
      playerLocation.lng,
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
  },
);
document.querySelector<HTMLButtonElement>("#west")!.addEventListener(
  "click",
  () => {
    playerLocation = leaflet.latLng(
      playerLocation.lat,
      playerLocation.lng - TILE_CELL_SIZE,
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
  },
);
document.querySelector<HTMLButtonElement>("#east")!.addEventListener(
  "click",
  () => {
    playerLocation = leaflet.latLng(
      playerLocation.lat,
      playerLocation.lng + TILE_CELL_SIZE,
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
  },
);

// create caches with unique coins
let serialNum = 0;
let rectArr: leaflet.Rectangle[] = [];
const cacheMomentos: Map<string, string> = new Map();
function spawnCache(obj: Cell): void {
  const aBox = grid.getCellBounds(obj);

  // create new cache if it does not already exist
  //if (!cacheMomentos.get(`${obj.i}${obj.j}`)) {
  rectArr.push(leaflet.rectangle(aBox, { color: "#483aea", weight: 1 }));
  rectArr[rectArr.length - 1].addTo(map);

  const coinCount = Math.floor(
    luck([obj.i, obj.j, "initialValue"].toString()) * 10,
  );

  const serialList: string[] = [];
  const rectCache: Cache = {
    coins: [],
    geoCache: new Geocache(obj.i, obj.j, serialList),
  };

  if (!cacheMomentos.get(`${obj.i}${obj.j}`)) {
    for (let i = 0; i < coinCount; i++) {
      const coinIdentity: Coin = { cell: obj, serial: `${serialNum}` };
      serialNum++;
      rectCache.coins.push(coinIdentity);
      rectCache.geoCache?.serials.push(
        `${rectCache.coins[i].cell.i}${rectCache.coins[i].cell.j}:${
          rectCache.coins[i].serial
        }`,
      );
      cacheMomentos.set(`${obj.i}${obj.j}`, rectCache.geoCache!.toMomento());
    }
    rectArr[rectArr.length - 1].bindPopup((): HTMLDivElement => {
      const rectInfo = document.createElement("div");
      rectInfo.innerHTML = `<div>Location:${Math.round(obj.i)}, ${
        Math.round(obj.j)
      }</div><button id=Give>Deposit</button><br>`;
      for (let i = 0; i < rectCache.coins.length; i++) {
        const serialString = `${rectCache.coins[i].cell.i}${
          rectCache.coins[i].cell.j
        }:${rectCache.coins[i].serial}`;
        const container = document.createElement("div");
        container.innerHTML =
          `${serialString} <button id=Take>Collect</button>`;

        container.querySelector<HTMLButtonElement>("#Take")!.addEventListener(
          "click",
          () => {
            const splicedCoin = rectCache.coins.splice(i, 1)[0];
            rectCache.geoCache?.serials.splice(i, 1);
            cacheMomentos.set(
              `${obj.i}${obj.j}`,
              rectCache.geoCache!.toMomento(),
            );
            rectInfo.removeChild(container);

            playerInventory.coins.push(splicedCoin);
            inventoryDisplay.innerHTML = `Inventory:<br>`;
            for (let i = 0; i < playerInventory.coins.length; i++) {
              inventoryDisplay.innerHTML += `${
                playerInventory.coins[i].cell.i
              }${playerInventory.coins[i].cell.j}:${
                playerInventory.coins[i].serial
              }<br>`;
            }
          },
        );
        rectInfo.appendChild(container);
      }
      rectInfo.querySelector<HTMLButtonElement>("#Give")!.addEventListener(
        "click",
        () => {
          if (playerInventory.coins.length) {
            const popCoin = playerInventory.coins.pop()!;
            rectCache.coins.push(popCoin);
            rectCache.geoCache?.serials.push(
              `${popCoin.cell.i}${popCoin.cell.j}:${popCoin.serial}`,
            );
            cacheMomentos.set(
              `${obj.i}${obj.j}`,
              rectCache.geoCache!.toMomento(),
            );
            inventoryDisplay.innerHTML = `Inventory:<br>`;
            for (let i = 0; i < playerInventory.coins.length; i++) {
              inventoryDisplay.innerHTML += `${
                playerInventory.coins[i].cell.i
              }${playerInventory.coins[i].cell.j}:${
                playerInventory.coins[i].serial
              }<br>`;
            }
            const container = document.createElement("div");
            container.innerHTML =
              `${popCoin.cell.i}${popCoin.cell.j}:${popCoin.serial} <button id=Take>Collect</button>`;
            rectInfo.appendChild(container);
            map.closePopup();
          }
        },
      );
      return rectInfo;
    });
    cacheMomentos.set(`${obj.i}${obj.j}`, rectCache.geoCache!.toMomento());
  } else {
    console.log(cacheMomentos.get(`${obj.i}${obj.j}`));
  }
}

// deterministic selection of which spots on the grid to put caches at
function determineCacheLocation(surroundingCells: Cell[]): void {
  for (let i = 0; i < surroundingCells.length; i++) {
    if (
      luck(
        [surroundingCells[i].i * 1e-4, surroundingCells[i].j * 1e-4].toString(),
      ) < CACHE_PROBABILITY
    ) {
      spawnCache(surroundingCells[i]);
    }
  }
}
determineCacheLocation(surroundingCells);
