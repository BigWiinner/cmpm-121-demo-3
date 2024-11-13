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

// represent longitude and latitude of coin
interface Cell {
  readonly i: number;
  readonly j: number;
}

// use cell and serial to make serial number at caches
interface Coin {
  cell: Cell;
  serial: string;
}

// generate coins with unique serial values
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

// create the player's inventory and display it as blank at
// the bottom of the screen
const playerInventory: Cache = { coins: [] };
const inventoryDisplay = document.getElementById("inventory")!;
inventoryDisplay.innerHTML = `Inventory:<br>`;

// spawn player at a predetermined spot.
// player controls to be implemented in D3.c
const playerIcon = leaflet.marker(OAKES_CLASSROOM);
playerIcon.addTo(map);
playerIcon.bindPopup(
  `Location: ${Math.round(OAKES_CLASSROOM.lat * 1e4)}, 
  ${Math.round(OAKES_CLASSROOM.lng * 1e4)}`,
);

// creates grid for caches to be placed on
const origin = OAKES_CLASSROOM;
const grid = new Board(TILE_CELL_SIZE, CELL_BLOCKS);
const cell = grid.getCellForPoint({
  i: Math.floor(origin.lat * 1e4),
  j: Math.floor(origin.lng * 1e4),
});
const surroundingCells = grid.getCellsNearPoint(cell);

// create caches with unique coins
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
    }</div><button id=Give>Deposit</button><br>`;
    for (let i = 0; i < rectCache.coins.length; i++) {
      const serialString = `${rectCache.coins[i].cell.i}${
        rectCache.coins[i].cell.j
      }:${rectCache.coins[i].serial}`;
      const container = document.createElement("div");
      container.innerHTML = `${serialString} <button id=Take>Collect</button>`;

      container.querySelector<HTMLButtonElement>("#Take")!.addEventListener(
        "click",
        () => {
          const splicedCoin = rectCache.coins.splice(i, 1)[0];
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
    rectInfo.querySelector<HTMLButtonElement>("#Give")!.addEventListener(
      "click",
      () => {
        if (playerInventory.coins.length) {
          const popCoin = playerInventory.coins.pop()!;
          rectCache.coins.push(popCoin);
          inventoryDisplay.innerHTML = `Inventory:<br>`;
          for (let i = 0; i < playerInventory.coins.length; i++) {
            inventoryDisplay.innerHTML += `${playerInventory.coins[i].cell.i}${
              playerInventory.coins[i].cell.j
            }:${playerInventory.coins[i].serial}<br>`;
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
}

// deterministic selection of which spots on the grid to put caches at
for (let i = 0; i < surroundingCells.length; i++) {
  if (
    luck(
      [surroundingCells[i].i * 1e-4, surroundingCells[i].j * 1e-4].toString(),
    ) < CACHE_PROBABILITY
  ) {
    spawnCache(surroundingCells[i]);
  }
}
