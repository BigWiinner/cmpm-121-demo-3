// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// style sheets
import "./style.css";
import "leaflet/dist/leaflet.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// CMPM 121 lecture hall, used for the center of the map
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_CELL_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const CELL_STEPS = 8;

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
let playerPoints = 0;
const pointsDisplay = document.getElementById("points")!;
pointsDisplay.innerHTML = `${playerPoints} points`;

// spawn player at a predetermined spot.
// player controls to be implemented in D3.c
const playerIcon = leaflet.marker(OAKES_CLASSROOM);
playerIcon.addTo(map);
playerIcon.bindPopup(`Inventory: ${playerPoints} coins`);

function spawnCache(i: number, j: number): void {
  const origin = OAKES_CLASSROOM;

  // creates a boundary on the map to store coins
  // based off of the arguments given to the function
  const aBox = leaflet.latLngBounds([[
    origin.lat + i * TILE_CELL_SIZE,
    origin.lng + j * TILE_CELL_SIZE,
  ], [
    origin.lat + (i + 1) * TILE_CELL_SIZE,
    origin.lng + (j + 1) * TILE_CELL_SIZE,
  ]]);
  const rect = leaflet.rectangle(aBox, { color: "#483aea", weight: 1 });
  rect.addTo(map);

  // coinCount to be changed for D3.b, when the parameters change to have
  // each coin generated to be unique.
  // For now, all coins generated are interchangeable integers.
  let coinCount = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  // Display div and button elements when a cache bound is clicked
  rect.bindPopup((): HTMLDivElement => {
    const rectInfo = document.createElement("div");
    rectInfo.innerHTML =
      `<div>There are <span id=value>${coinCount}</span> coins at ${i} ${j}.</div>
      <button id=Take>Collect</button><button id=Give>Desposit</button>`;

    // Allow player to collect coins at cache
    rectInfo.querySelector<HTMLButtonElement>("#Take")!.addEventListener(
      "click",
      () => {
        if (coinCount) {
          coinCount--;
          rectInfo.querySelector<HTMLButtonElement>("#value")!.innerHTML =
            coinCount.toString();
          playerPoints++;
          playerIcon.bindPopup(`Inventory: ${playerPoints}`);
          pointsDisplay.innerHTML = `${playerPoints} points`;
        }
      },
    );

    // Allow player to deposit coins at cache
    rectInfo.querySelector<HTMLButtonElement>("#Give")!.addEventListener(
      "click",
      () => {
        if (playerPoints) {
          coinCount++;
          rectInfo.querySelector<HTMLButtonElement>("#value")!.innerHTML =
            coinCount.toString();
          playerPoints--;
          playerIcon.bindPopup(`Inventory: ${playerPoints}`);
          pointsDisplay.innerHTML = `${playerPoints} points`;
        }
      },
    );

    return rectInfo;
  });
}

// Generate caches based off of luck function from luck.ts.
// If luck generates a value small enough,
// spawn a cache at spot determined with i, j on the map.
for (let i = -CELL_STEPS; i <= CELL_STEPS; i++) {
  for (let j = -CELL_STEPS; j <= CELL_STEPS; j++) {
    if (luck([i, j].toString()) < CACHE_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
