// original license
// https://github.com/cyclejs/cycle-core
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
  Observable,
  Observer,
  ReplaySubject,
  Subject,
  Subscription
} from 'rxjs';

type Source = Observable<any>;
type Sink = Source;
type Sources = { [driverName: string]: any };
type Sinks = { [driverName: string]: Observable<any> };
type Driver = (sink: Sink, driverName: string) => Source;
type Drivers = { [driverName: string]: Driver };
type Proxy = Subject<any>;
type Proxies = { [driverName: string]: Proxy };
type Main = (sources: Sources) => Sinks;
type Dispose = () => void;

const set = <T> (
  obj: { [key: string]: T },
  [key, value]: [string, T]
): { [key: string]: T } => {
  obj[key] = value;
  return obj;
};

const logToConsoleError = (error: Error): void => {
  const target = error.stack || error;
  if (console && console.error) {
    console.error(target);
  }
};

const makeDisposeSinks =
  (driverNames: string[], sinks: Sinks, sinkProxies: Proxies) => {
  let sinksSubscription = new Subscription()
  setTimeout(() => {
    driverNames
      .map<[string, Sink, Proxy]>(
        name => [name, sinks[name], sinkProxies[name]]
      )
      .map(
        ([name, sink, sinkProxy]) =>
          sink
            .do(null, logToConsoleError)
            .subscribe(sinkProxy)
      )
      .forEach(subscription => sinksSubscription.add(subscription));
  }, 1);
  return (): void => {
    sinksSubscription.unsubscribe();
    driverNames
      .map(name => sinkProxies[name])
      .forEach(sinkProxy => sinkProxy.unsubscribe());
  };
};

const makeDisposeSources = (driverNames: string[], sources: any): Dispose =>
  (): void =>
    driverNames
      .map(name => sources[name])
      .filter(source => typeof source.dispose === 'function')
      .forEach(source => source.dispose());

const attachDispose = <T>(s: T, dispose: Dispose): T => {
  Object.defineProperty(s, `unsubscribe`, {
    enumerable: false,
    value: dispose
  });
  return s;
};

const run = (main: Main, drivers: Drivers): {
  sources: Sources,
  sinks: Sinks
} => {
  const driverNames = Object.keys(drivers);
  const sinkProxies = driverNames
    .map<[string, ReplaySubject<any>]>(name => [name, new ReplaySubject(1)])
    .reduce<Proxies>(set, {});
  const sources = driverNames
    .map<[string, Driver, Proxy]>(
      name => [name, drivers[name], sinkProxies[name]])
    .map(([name, driver, sink]) => [name, driver(sink, name)])
    .reduce<Sources>(set, {});
  const sinks = main(sources);
  const disposeSinks = makeDisposeSinks(driverNames, sinks, sinkProxies);
  const disposeSources = makeDisposeSources(driverNames, sources);
  return {
    sinks: attachDispose(sinks, disposeSinks),
    sources: attachDispose(sources, disposeSources)
  };
}

export { run };