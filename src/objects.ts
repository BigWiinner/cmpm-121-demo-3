// Cell stores location of player and caches
export interface Cell {
  readonly i: number;
  readonly j: number;
}

// use cell and serial to make serial number at caches
export interface Coin {
  cell: Cell;
  serial: string;
}

// generate coins with unique serial values
export interface Cache {
  coins: Coin[];
  geoCache: Geocache | undefined;
}

// use memento to save cache states
interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Geocache implements Momento<string> {
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
