type PagerOptions = {
  deduplicate: Uint8Array;
};

export class Pager {
  length: number;
  updates: Page[];
  path: Uint16Array;
  pages: any[];
  maxPages: number;
  level: number;
  pageSize: number;
  deduplicate: Uint8Array | null;
  zeros: Uint8Array | null;
  constructor(pageSize: number, opts: Partial<PagerOptions> = {}) {
    this.length = 0;
    this.updates = [];
    this.path = new Uint16Array(4);
    this.pages = new Array(32768);
    this.maxPages = this.pages.length;
    this.level = 0;
    this.pageSize = pageSize || 1024;
    this.deduplicate = opts.deduplicate ?? null;
    this.zeros = this.deduplicate
      ? new Uint8Array(this.deduplicate.length)
      : null;
  }
  updated(page: Page) {
    while (
      this.deduplicate &&
      page.buffer[page.deduplicate] === this.deduplicate[page.deduplicate]
    ) {
      page.deduplicate++;
      if (page.deduplicate === this.deduplicate.length) {
        page.deduplicate = 0;
        if (equals(page.buffer, this.deduplicate)) {
          page.buffer = this.deduplicate;
        }
        break;
      }
    }
    if (page.updated || !this.updates) return;
    page.updated = true;
    this.updates.push(page);
  }
  lastUpdate() {
    const page = this.updates.pop();
    if (!page) return null;
    page.updated = false;
    return page;
  }

  _array(i: number, noAllocate: false): (Page | undefined)[];
  _array(i: number, noAllocate: boolean): (Page | undefined)[] | undefined;
  _array(i: number, noAllocate: boolean): (Page | undefined)[] | undefined {
    if (i >= this.maxPages) {
      if (noAllocate) return;
      grow(this, i);
    }

    factor(i, this.path);

    let arr = this.pages;

    for (let j = this.level; j > 0; j--) {
      const p = this.path[j];
      let next = arr[p];

      if (!next) {
        if (noAllocate) return;
        next = arr[p] = new Array(32768);
      }

      arr = next;
    }

    return arr;
  }

  get(i: number, noAllocate: false): Page;
  get(i: number, noAllocate: boolean): Page | undefined;
  get(i: number, noAllocate: boolean): Page | undefined {
    const arr = this._array(i, noAllocate);
    const first = this.path[0];
    let page = arr && arr[first];

    if (!page && arr) {
      page = arr[first] = new Page(i, new Uint8Array(this.pageSize));
      if (i >= this.length) this.length = i + 1;
    }

    if (
      page &&
      page.buffer === this.deduplicate &&
      this.deduplicate &&
      !noAllocate
    ) {
      page.buffer = copy(page.buffer);
      page.deduplicate = 0;
    }

    return page;
  }
  set(i: number, buf: Uint8Array) {
    const arr = this._array(i, false);
    const first = this.path[0];

    if (i >= this.length) this.length = i + 1;

    if (!buf || (this.zeros && equals(buf, this.zeros))) {
      arr[first] = undefined;
      return;
    }

    if (this.deduplicate && equals(buf, this.deduplicate)) {
      buf = this.deduplicate;
    }

    const page = arr[first];
    const b = truncate(buf, this.pageSize);

    if (page) page.buffer = b;
    else arr[first] = new Page(i, b);
  }
  toBuffer() {
    const list = new Array(this.length);
    const empty = new Uint8Array(this.pageSize);
    let ptr = 0;

    while (ptr < list.length) {
      const arr = this._array(ptr, true);
      for (let i = 0; i < 32768 && ptr < list.length; i++) {
        list[ptr++] = arr?.[i] ? arr[i]?.buffer : empty;
      }
    }

    return Buffer.concat(list);
  }
}

function grow(pager: Pager, index: number) {
  while (pager.maxPages < index) {
    const old = pager.pages;
    pager.pages = new Array(32768);
    pager.pages[0] = old;
    pager.level++;
    pager.maxPages *= 32768;
  }
}

function truncate(buf: Uint8Array, len: number) {
  if (buf.length === len) return buf;
  if (buf.length > len) return buf.slice(0, len);
  const cpy = new Uint8Array(len);
  cpy.set(buf.subarray(0, cpy.byteLength), 0);
  return cpy;
}

function copy(buf: Uint8Array) {
  const cpy = new Uint8Array(buf.byteLength);
  cpy.set(buf, 0);
  return cpy;
}

function equals(a: Uint8Array, b: Uint8Array) {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

class Page {
  offset: number;
  buffer: Uint8Array;
  updated: boolean;
  deduplicate: number;
  constructor(i: number, buf: Uint8Array) {
    this.offset = i * buf.length;
    this.buffer = buf;
    this.updated = false;
    this.deduplicate = 0;
  }
}

function factor(n: number, out: Uint16Array) {
  n = (n - (out[0] = n & 32767)) / 32768;
  n = (n - (out[1] = n & 32767)) / 32768;
  out[3] = ((n - (out[2] = n & 32767)) / 32768) & 32767;
}
