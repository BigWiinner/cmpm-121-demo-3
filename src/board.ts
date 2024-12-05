import leaflet from "leaflet";

import { Cell } from "./objects.ts";

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.get(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.latLng): Cell {
    return this.getCanonicalCell({ i: point.i, j: point.j });
  }

  getCellBounds(cell: Cell): leaflet.latLngBounds {
    return leaflet.latLngBounds([[
      cell.i * this.tileWidth,
      cell.j * this.tileWidth,
    ], [
      cell.i * this.tileWidth + 1e-4,
      cell.j * this.tileWidth + 1e-4,
    ]]);
  }

  getCellsNearPoint(point: leaflet.latLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const tvr = this.tileVisibilityRadius;
    for (let i = -tvr; i < tvr; i++) {
      for (let j = -tvr; j < tvr; j++) {
        resultCells.push(
          this.getCanonicalCell({
            i: originCell.i + i,
            j: originCell.j + j,
          }),
        );
      }
    }
    return resultCells;
  }
}
