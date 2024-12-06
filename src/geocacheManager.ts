// geocacheManager module provided by Brace during D3.e
// https://canvas.ucsc.edu/courses/76391/assignments/650458?return_to=https%3A%2F%2Fcanvas.ucsc.edu%2Fcalendar%23view_name%3Dmonth%26view_start%3D2024-12-05
import { loadCaches, saveCaches } from "./storage.ts";
import { Cache, Cell, Coin, Geocache } from "./objects.ts";
import luck from "./luck.ts";

export class GeocacheManager {
  private cacheMomentos: Map<string, string> = new Map();
  private serialNum = 0;
  private MAX_COINS = 6;

  constructor() {
    loadCaches(this.cacheMomentos);
  }

  spawnCache(cell: Cell): Cache {
    const coinCount = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) *
        (this.MAX_COINS + 1),
    );

    const cache: Cache = {
      coins: [],
      geoCache: new Geocache(cell.i, cell.j, []),
    };

    for (let i = 0; i < coinCount; i++) {
      const serial = `${this.serialNum++}`;
      cache.coins.push({ cell, serial });
      cache.geoCache!.serials.push(serial);
    }

    this.cacheMomentos.set(
      cell.i + ":" + cell.j,
      cache.geoCache?.toMomento() || "",
    );
    saveCaches(this.cacheMomentos);

    return cache;
  }

  handleCoinDeposit(cell: Cell, coin: Coin): void {
    const key = `${cell.i}:${cell.j}`;
    const momento = this.cacheMomentos.get(key);

    if (momento) {
      // Rebuild the cache from its momento
      const geoCache = new Geocache(cell.i, cell.j, []);
      geoCache.fromMomento(momento);

      // Add the coin to both the serialized state and the array
      geoCache.serials.push(coin.serial);

      // Update the momento for this cache
      this.cacheMomentos.set(key, geoCache.toMomento());
      saveCaches(this.cacheMomentos); // Save updated caches
    } else {
      console.warn("No cache found to deposit coin into!");
    }
  }

  handleCoinWithdrawal(cell: Cell, index: number): Coin | null {
    const key = `${cell.i}:${cell.j}`;
    const momento = this.cacheMomentos.get(key);

    if (momento) {
      // Rebuild the cache from its momento
      const geoCache = new Geocache(cell.i, cell.j, []);
      geoCache.fromMomento(momento);

      // Remove the coin from both the data and the serialized list
      if (geoCache.serials.length > index) {
        const serial = geoCache.serials[index];
        geoCache.serials.splice(index, 1); // Remove from serialized list

        const coin: Coin = { cell, serial }; // Build the coin object
        this.cacheMomentos.set(key, geoCache.toMomento()); // Update momento
        saveCaches(this.cacheMomentos);

        return coin; // Return the collected coin
      }
    }

    return null; // If no coin to remove, return null
  }

  getCache(cell: Cell): Cache | null {
    const momento = this.cacheMomentos.get(cell.i + ":" + cell.j);
    if (momento) {
      const geoCache = new Geocache(0, 0, []);
      geoCache.fromMomento(momento);
      return {
        coins: geoCache.serials.map((serial) => ({ cell, serial })),
        geoCache,
      };
    }
    return null;
  }

  getAllCaches(): Map<string, Cache> {
    const allCaches = new Map<string, Cache>();

    this.cacheMomentos.forEach((momento, key) => {
      const geoCache = new Geocache(0, 0, []);
      geoCache.fromMomento(momento);

      const cell: Cell = { i: geoCache.i, j: geoCache.j };
      const coins: Coin[] = geoCache.serials.map((serial) => ({
        cell,
        serial,
      }));

      allCaches.set(key, { coins, geoCache });
    });

    return allCaches;
  }

  clearCache(): void {
    this.cacheMomentos.clear();
    this.serialNum = 0;
  }
}
