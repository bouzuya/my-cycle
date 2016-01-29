import { run } from './cycle-core';
import { h, makeDOMDriver } from './cycle-dom';
import { Observable, ReplaySubject } from 'rxjs';

type Sources = { [driverName: string]: any };
type Sinks = { [driverName: string]: Observable<any> };
type State = { count: number };
type Actions = { [actionName: string]: Observable<any> };

const intent = (sources: Sources): Actions => {
  const { DOM } = sources;
  const click$: Observable<Event> = DOM.events('click');
  const actions: Actions = { click$ };
  return actions;
};

const model = (actions: Actions): Observable<State> => {
  const { click$ } = actions;
  const initialState: State = { count: 0 };
  const transform = <T, U>(f: (v: T, s: State) => U) =>
    (value: T) =>
      (state: State): State =>
        Object.assign({}, state, f(value, state));
  const action$ = Observable
    .merge(
      click$.map(transform((_, { count }) => ({ count: count + 1 })))
    );
  const state$ = Observable
    .of(initialState)
    .merge(action$)
    .scan((state, action) => action(state))
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