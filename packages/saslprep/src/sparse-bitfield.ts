import { Pager } from './memory-pager';

type BitFieldOptions = {
  buffer: Uint8Array;
  pageOffset: number;
  pageSize: number;
  pages: Pager;
  trackUpdates: boolean;
};

export class BitField {
  pageOffset: number;
  pageSize: number;
  pages: Pager;
  byteLength: number;
  length: number;
  _trackUpdates: boolean;
  _pageMask: number;

  constructor(options: Partial<BitFieldOptions> | Uint8Array = {}) {
    const opts = 'byteLength' in options ? { buffer: options } : options;

    this.pageOffset = opts.pageOffset || 0;
    this.pageSize = opts.pageSize || 1024;
    this.pages = opts.pages || new Pager(this.pageSize);

    this.byteLength = this.pages.length * this.pageSize;
    this.length = 8 * this.byteLength;

    if (!isPowerOfTwo(this.pageSize)) {
      throw new Error('The page size should be a power of two');
    }

    this._trackUpdates = !!opts.trackUpdates;
    this._pageMask = this.pageSize - 1;

    if (opts.buffer) {
      for (let i = 0; i < opts.buffer.length; i += this.pageSize) {
        this.pages.set(
          i / this.pageSize,
          opts.buffer.slice(i, i + this.pageSize)
        );
      }
      this.byteLength = opts.buffer.length;
      this.length = 8 * this.byteLength;
    }
  }
  get(i: number) {
    const o = i & 7;
    const j = (i - o) / 8;

    return !!(this.getByte(j) & (128 >> o));
  }
  getByte(i: number) {
    const o = i & this._pageMask;
    const j = (i - o) / this.pageSize;
    const page = this.pages.get(j, true);

    return page ? page.buffer[o + this.pageOffset] : 0;
  }
  set(i: number, v: boolean) {
    const o = i & 7;
    const j = (i - o) / 8;
    const b = this.getByte(j);

    return this.setByte(j, v ? b | (128 >> o) : b & (255 ^ (128 >> o)));
  }
  toBuffer() {
    const all = new Uint8Array(this.pages.length * this.pageSize);

    for (let i = 0; i < this.pages.length; i++) {
      const next = this.pages.get(i, true);
      const allOffset = i * this.pageSize;
      if (next) {
        all.set(
          next.buffer.subarray(
            this.pageOffset,
            this.pageOffset + this.pageSize
          ),
          allOffset
        );
      }
    }

    return all;
  }
  setByte(i: number, b: number) {
    let o = i & this._pageMask;
    const j = (i - o) / this.pageSize;
    const page = this.pages.get(j, false);

    o += this.pageOffset;

    if (page.buffer[o] === b) return false;
    page.buffer[o] = b;

    if (i >= this.byteLength) {
      this.byteLength = i + 1;
      this.length = this.byteLength * 8;
    }

    if (this._trackUpdates) this.pages.updated(page);

    return true;
  }
}

function isPowerOfTwo(x: number) {
  return !(x & (x - 1));
}
