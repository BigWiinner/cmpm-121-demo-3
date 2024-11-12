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

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Coin {
  cell: Cell;
  serial: string;
}

interface Cache {
  coins: Coin[];
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

// playerPoints to be changed for D3.b with an inventory where each coin
// collected is unique.
// For now, all coins collected are interchangeable integers.
//let playerPoints = 0;
//const pointsDisplay = document.getElementById("points")!;
//pointsDisplay.innerHTML = `${playerPoints} points`;
const playerInventory: Cache = { coins: [] };
const inventoryDisplay = document.getElementById("inventory")!;
inventoryDisplay.innerHTML = `Inventory:<br> ${playerInventory.coins}`;

// spawn player at a predetermined spot.
// player controls to be implemented in D3.c
const playerIcon = leaflet.marker(OAKES_CLASSROOM);
playerIcon.addTo(map);
playerIcon.bindPopup(
  `Location: ${Math.round(OAKES_CLASSROOM.lat * 1e4)}, 
  ${Math.round(OAKES_CLASSROOM.lng * 1e4)}`,
);

const origin = OAKES_CLASSROOM;
const grid = new Board(TILE_CELL_SIZE, CELL_BLOCKS);
const cell = grid.getCellForPoint({
  i: Math.floor(origin.lat * 1e4),
  j: Math.floor(origin.lng * 1e4),
});
const arr = grid.getCellsNearPoint(cell);

let serialNum = 0;
function spawnCache(obj: Cell): void {
  const aBox = grid.getCellBounds(obj);
  const rect = leaflet.rectangle(aBox, { color: "#483aea", weight: 1 });
  rect.addTo(map);

  const coinCount = Math.floor(
    luck([obj.i, obj.j, "initialValue"].toString()) * 10,
  );
  const rectCache: Cache = { coins: [] };
  for (let i = 0; i < coinCount; i++) {
    const coinIdentity: Coin = { cell: obj, serial: `${serialNum}` };
    serialNum++;
    rectCache.coins.push(coinIdentity);
  }

  rect.bindPopup((): HTMLDivElement => {
    const rectInfo = document.createElement("div");
    rectInfo.innerHTML = `<div>Location:${Math.round(obj.i)}, ${
      Math.round(obj.j)
    }</div><button id=Give>Deposit</button>`;
    for (let i = 0; i < rectCache.coins.length; i++) {
      const container = document.createElement("div");
      const serialString = `${rectCache.coins[i].cell.i}${
        rectCache.coins[i].cell.j
      }:${rectCache.coins[i].serial}`;
      container.innerHTML = `${serialString}  <button id=Take>Collect</button>`;

      container.querySelector<HTMLButtonElement>("#Take")!.addEventListener(
        "click",
        () => {
          playerInventory.coins.push(rectCache.coins[i]);
          inventoryDisplay.innerHTML += `${serialString}<br>`;
        },
      );
      rectInfo.querySelector<HTMLButtonElement>("#Give")!.addEventListener(
        "click",
        () => {
          if (playerInventory.coins) {
            rectCache.coins.push(playerInventory.coins.pop()!);
          }
        },
      );
      rectInfo.appendChild(container);
    }
    return rectInfo;
  });
}

for (let i = 0; i < arr.length; i++) {
  if (luck([arr[i].i * 1e-4, arr[i].j * 1e-4].toString()) < CACHE_PROBABILITY) {
    spawnCache(arr[i]);
  }
}
