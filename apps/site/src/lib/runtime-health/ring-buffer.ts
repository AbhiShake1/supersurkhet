export type RuntimeHealthRingBufferSnapshot<T> = {
  readonly capacity: number;
  readonly size: number;
  readonly items: readonly T[];
};

function normalizeCapacity(capacity: number): number {
  if (!Number.isFinite(capacity) || Number.isNaN(capacity)) {
    return 1;
  }
  return Math.max(1, Math.floor(capacity));
}

export class RuntimeHealthRingBuffer<T> {
  readonly #capacity: number;
  #items: T[];

  constructor(capacity: number, initialItems?: readonly T[]) {
    this.#capacity = normalizeCapacity(capacity);
    this.#items = [];

    if (initialItems && initialItems.length > 0) {
      this.appendMany(initialItems);
    }
  }

  get capacity(): number {
    return this.#capacity;
  }

  get size(): number {
    return this.#items.length;
  }

  append(item: T): RuntimeHealthRingBufferSnapshot<T> {
    this.#items.push(item);
    this.#truncate();
    return this.snapshot();
  }

  appendMany(items: readonly T[]): RuntimeHealthRingBufferSnapshot<T> {
    if (items.length === 0) {
      return this.snapshot();
    }

    if (items.length >= this.#capacity) {
      this.#items = [...items.slice(items.length - this.#capacity)];
      return this.snapshot();
    }

    this.#items.push(...items);
    this.#truncate();
    return this.snapshot();
  }

  clear(): RuntimeHealthRingBufferSnapshot<T> {
    this.#items = [];
    return this.snapshot();
  }

  snapshot(): RuntimeHealthRingBufferSnapshot<T> {
    return {
      capacity: this.#capacity,
      size: this.#items.length,
      items: Object.freeze([...this.#items]),
    };
  }

  #truncate(): void {
    const overflow = this.#items.length - this.#capacity;
    if (overflow > 0) {
      this.#items.splice(0, overflow);
    }
  }
}

export function createRuntimeHealthRingBuffer<T>(
  capacity: number,
  initialItems?: readonly T[],
): RuntimeHealthRingBuffer<T> {
  return new RuntimeHealthRingBuffer(capacity, initialItems);
}
