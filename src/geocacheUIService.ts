// geocacheUIService module provided by Brace during D3.e
// https://canvas.ucsc.edu/courses/76391/assignments/650458?return_to=https%3A%2F%2Fcanvas.ucsc.edu%2Fcalendar%23view_name%3Dmonth%26view_start%3D2024-12-05
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import { Cell } from "./objects.ts";
import { MapService } from "./mapService.ts";
import { GeocacheManager } from "./geocacheManager.ts";
import { Board } from "./board.ts";
import { PlayerInventory } from "./playerInventory.ts";

export class GeocacheUIService {
  private rectOverlays: Map<string, leaflet.Rectangle> = new Map();

  constructor(
    private mapService: MapService,
    private cacheManager: GeocacheManager,
    private playerInventory: PlayerInventory,
    private grid: Board,
  ) {}

  addRect(cell: Cell): void {
    const bounds = this.grid.getCellBounds(cell);
    const rect = leaflet.rectangle(bounds, { color: "#483aea", weight: 1 });
    rect.addTo(this.mapService.getMap());

    rect.bindPopup(() => this.createPopup(cell));
    this.rectOverlays.set(cell.i + ":" + cell.j, rect);
  }

  removeRect(cell: Cell): void {
    const rect = this.rectOverlays.get(cell.i + ":" + cell.j);
    if (rect) {
      rect.remove();
      this.rectOverlays.delete(cell.i + ":" + cell.j);
    }
  }

  private createPopup(cell: Cell): HTMLDivElement {
    const cache = this.cacheManager.getCache(cell);
    const container = document.createElement("div");

    if (cache) {
      cache.coins.forEach((coin, i) => {
        const coinLine = document.createElement("div");
        coinLine.textContent = `${coin.cell.i}${coin.cell.j}:${coin.serial} `;
        const collectButton = document.createElement("button");
        collectButton.textContent = "Collect";
        collectButton.addEventListener("click", () => {
          const collectedCoin = this.cacheManager
            .handleCoinWithdrawal(
              cell,
              i,
            );

          if (collectedCoin) {
            // Add the coin to the player's inventory
            this.playerInventory.addToInv(collectedCoin); // Update player inventory

            // Update the UI to reflect the coin no longer exists in the cache
            this.updatePopup(cell, container);
          } else {
            alert("No coin to collect!"); // Fallback
          }
        });

        coinLine.append(collectButton);
        container.append(coinLine);
      });

      const depositButton = document.createElement("button");
      depositButton.textContent = "Deposit";
      depositButton.addEventListener("click", () => {
        if (this.playerInventory.getLength()) {
          // Pop the coin from the player's inventory
          const coinToDeposit = this.playerInventory.removeFromInv();
          if (coinToDeposit) {
            // Deposit it into the cache (via GeocacheManager)
            this.cacheManager.handleCoinDeposit(
              cell,
              coinToDeposit,
            );

            // Refresh the UI popup to reflect new cache state
            this.updatePopup(cell, container);
          }
        } else {
          alert("No coins in inventory to deposit!");
        }
      });

      container.appendChild(depositButton);
    }

    return container;
  }

  updatePopup(cell: Cell, popupElement: HTMLDivElement): void {
    const cache = this.cacheManager.getCache(cell);
    popupElement.innerHTML = ""; // Clear the old content

    if (cache) {
      cache.coins.forEach((coin, i) => {
        const coinLine = document.createElement("div");
        coinLine.textContent = `${coin.serial}`;

        const collectButton = document.createElement("button");
        collectButton.textContent = "Collect";
        collectButton.addEventListener("click", () => {
          const collectedCoin = this.cacheManager
            .handleCoinWithdrawal(
              cell,
              i,
            );

          if (collectedCoin) {
            this.playerInventory.addToInv(collectedCoin); // Add to inventory
            this.updatePopup(cell, popupElement); // Refresh popup
          }
        });

        coinLine.appendChild(collectButton);
        popupElement.appendChild(coinLine);
      });
    }
  }

  deleteAllRects(): void {
    this.rectOverlays.forEach((rect, _key) => {
      rect.remove();
    });
    this.rectOverlays.clear();
  }
}
