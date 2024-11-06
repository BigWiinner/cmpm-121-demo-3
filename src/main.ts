import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_CELL_SIZE = 0.0001;
const CACHE_AMOUNT = 0.1;
const CELL_STEPS = 8;

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerIcon = leaflet.marker(OAKES_CLASSROOM);
playerIcon.addTo(map);

let playerPoints = 0;
const pointsDisplay = document.getElementById("points")!;
pointsDisplay.innerHTML = "No points yet...";

function spawnCache(i: number, j: number): void {
  console.log(`${i}, ${j}`);
  const origin = OAKES_CLASSROOM;
  const aBox = leaflet.latLngBounds([[
    origin.lat + i * TILE_CELL_SIZE,
    origin.lng + j * TILE_CELL_SIZE,
  ], [
    origin.lat + (i + 1) * TILE_CELL_SIZE,
    origin.lng + (j + 1) * TILE_CELL_SIZE,
  ]]);
  const rect = leaflet.rectangle(aBox, { color: "#ff00ff", weight: 1 });
  rect.addTo(map);

  // TODO ADD INTERACTION WITH RECTS
  rect.bindPopup(() => {
    const rectInfo = document.createElement("div");
    rectInfo.innerHTML =
      "<div>PLACEHOLDER</div><button id=Take>Collect</button><button id=Give>Desposit</button>";

    rectInfo.querySelector<HTMLButtonElement>("#Take")!.addEventListener(
      "click",
      () => {
        playerPoints++;
        pointsDisplay.innerHTML = `${playerPoints} points`;
      },
    );

    rectInfo.querySelector<HTMLButtonElement>("#Give")!.addEventListener(
      "click",
      () => {
        if (playerPoints > 0) {
          playerPoints--;
          pointsDisplay.innerHTML = `${playerPoints} points`;
        }
      },
    );

    return rectInfo;
  });
}

for (let i = -CELL_STEPS; i < CELL_STEPS; i++) {
  for (let j = -CELL_STEPS; j < CELL_STEPS; j++) {
    if (luck([i, j].toString()) < CACHE_AMOUNT) {
      spawnCache(i, j);
    }
  }
}
