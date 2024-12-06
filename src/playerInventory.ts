import { loadInventory, saveInventory } from "./storage.ts";
import { Cache, Coin } from "./objects.ts";

export class PlayerInventory {
  private playerInventory: Cache = {
    coins: loadInventory() || [],
    geoCache: undefined,
  };
  private inventoryDisplay = document.getElementById("inventory")!;
  constructor() {
    this.updateInventoryDisplay();
  }

  addToInv(coin: Coin): void {
    this.playerInventory.coins.push(coin);
    this.updateInventoryDisplay();
    saveInventory(this.playerInventory);
  }

  removeFromInv(): Coin | null {
    if (this.playerInventory.coins.length) {
      const popCoin = this.playerInventory.coins.pop()!;
      this.updateInventoryDisplay();
      saveInventory(this.playerInventory);
      return popCoin;
    }
    return null;
  }

  getLength(): number {
    return this.playerInventory.coins.length;
  }

  private updateInventoryDisplay(): void {
    this.inventoryDisplay.innerHTML = `Inventory:<br>`;
    for (let i = 0; i < this.playerInventory.coins.length; i++) {
      this.inventoryDisplay.innerHTML += `${
        this.playerInventory.coins[i].cell.i
      }${this.playerInventory.coins[i].cell.j}:${
        this.playerInventory.coins[i].serial
      }<br>`;
    }
  }

  clearInventory(): void {
    this.playerInventory.coins = [];
    this.updateInventoryDisplay();
  }
}
