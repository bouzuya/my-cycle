import { run } from './cycle-core';
import { h, makeDOMDriver } from './cycle-dom';
import { Observable, ReplaySubject } from 'rxjs';

type Sources = { [driverName: string]: any };
type Sinks = { [driverName: string]: Observable<any> };
type State = { count: number };
type Actions = { [actionName: string]: Observable<any> };

const intent = (sources: Sources): Actions => {
  const { DOM } = sources;
  // const click$: Observable<Event> = DOM.select('input').events('click');
  const click$ = Observable.interval(1000);
  const actions: Actions = { click$ };
  return actions;
};

const model = (actions: Actions): Observable<State> => {
  const { click$ } = actions;
  const state$ = click$
  .scan((sum: number) => sum + 1, 0)
  .map((count: number) => ({ count }))
  .multicast(new ReplaySubject(1))
  .refCount();
  return state$;
};

const view = (state$: Observable<State>): Sinks => {
  const vtree$ = state$.map(({ count }) => {
    return h('div.count', ['' + count])
  });
  const sinks: Sinks = { DOM: vtree$ };
  return sinks;
};

export default function m() {
  const main = (sources: Sources): Sinks => view(model(intent(sources)));
  const drivers: any = { DOM: makeDOMDriver('body') };
  run(main, drivers);
}