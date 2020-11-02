/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */

export class List<T> {
  
  _sentinel: { _next: any, _prev: any };
  
  constructor() {
    var sentinel: any = {};
    sentinel._next = sentinel._prev = sentinel;
    this._sentinel = sentinel;
  }

  dequeue(): T {
    var sentinel = this._sentinel;
    var entry = sentinel._prev;
    if (entry !== sentinel) {
      unlink(entry);
      return entry as T;
    }
  };

  enqueue(entry: T) {
    var sentinel = this._sentinel;
    var item = entry as any;
    if (item._prev && item._next) {
      unlink(item);
    }
    item._next = sentinel._next;
    sentinel._next._prev = item;
    sentinel._next = item;
    item._prev = sentinel;
  };

  toString() {
    var strs = [];
    var sentinel = this._sentinel;
    var curr = sentinel._prev;
    while (curr !== sentinel) {
      strs.push(JSON.stringify(curr, filterOutLinks));
      curr = curr._prev;
    }
    return "[" + strs.join(", ") + "]";
  };
}

function unlink(entry: any) {
  entry._prev._next = entry._next;
  entry._next._prev = entry._prev;
  delete entry._next;
  delete entry._prev;
}

function filterOutLinks(k: string, v: any): any {
  if (k !== "_next" && k !== "_prev") {
    return v;
  }
}
