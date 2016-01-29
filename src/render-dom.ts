// original license
// https://github.com/cyclejs/cycle-dom
// The MIT License (MIT)
//
// Copyright (c) 2015 Andre Medeiros
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


import {
  ConnectableObservable,
  Observable,
  ReplaySubject
} from 'rxjs';
import { pairwise } from 'rxjs/operator/pairwise';
import { h, diff, parse, patch, VTree, RTree } from './virtual-dom';

type Source = any;
type Sink = Observable<any>;
type Driver = (sink: Sink) => Source;
type DOMSource = {};
type DOMSink = Observable<any>;

// TODO: VText | VWidget | VThunk
const parseVTreeInfo = (vtree: any): {
  id: string;
  className: string;
  tagName: string;
} => {
  const { id } = vtree.properties;
  const { className } = vtree.properties;
  const info = { id, className, tagName: vtree.tagName.toUpperCase() };
  return info;
};

const parseRTreeInfo = (rtree: RTree): {
  id: string;
  className: string;
  tagName: string;
} => {
  const { id, className, tagName } = rtree;
  const info = { id, className, tagName };
  return info;
};

const render = (rtree: RTree, [oldVTree, newVTree]: [VTree, VTree]): RTree =>
  patch(rtree, diff(oldVTree, newVTree));

const makeEnsureRoot = (rtree: RTree) => {
  return (vtree: VTree): VTree => {
    const v = parseVTreeInfo(vtree);
    const r = parseRTreeInfo(rtree);
    const sameId = v.id === r.id;
    const sameClass = v.className === r.className;
    const sameTagName = v.tagName === r.tagName;
    if (sameId && sameClass && sameTagName) return vtree;
    const attrs: { id?: string, className?: string } = {};
    if (r.id) attrs.id = r.id;
    if (r.className) attrs.className = r.className;
    return h(r.tagName, attrs, [vtree])
  };
};

const makeDOMDriver = (container: string): Driver => {
  const rtree = document.querySelector(container);
  const domDriver = (sink: DOMSink): DOMSource => {
    const vtree$: Observable<VTree> = sink
      .filter(i => i)
      .map<VTree>(makeEnsureRoot(rtree))
      .startWith(parse);
    const pair$: Observable<[VTree, VTree]> = pairwise.apply(vtree$);
    const rtree$: ConnectableObservable<RTree> = pair$
      .scan<RTree>(render, rtree)
      .multicast(new ReplaySubject(1));
    const subscription = rtree$.connect();
    const source = {
      events: makeEvents(rtree$)
    };
    return source;
  };
  return domDriver;
};

const makeEvents = (rtree$: Observable<RTree>) => {
  return (eventName: string): Observable<Event> => {
    return rtree$
      .switchMap<Event>(root => Observable.fromEvent(root, eventName))
      .share();
  };
};

export { makeDOMDriver };
