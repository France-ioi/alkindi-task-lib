
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {link, include} from 'epic-linker';

import './shim';
import AppBundle from './app';
import WorkspaceBundle from './workspace';
import SaveBundle from './save';
import AnswersBundle from './answers';
import HintsBundle from './hints';
import TaskBaseBundle from './task_base';

export default function (container, options, TaskBundle) {
  const task = linkTask(TaskBundle);
  startTask(task, options);
  container && mountTask(task, container, options);
};

export function linkTask (TaskBundle) {
  return link(function* () {
    yield include(AppBundle);
    yield include(WorkspaceBundle);
    yield include(SaveBundle);
    yield include(AnswersBundle);
    yield include(HintsBundle);
    yield include(TaskBaseBundle);
    yield include(TaskBundle);
  });
};

export function startTask (task, options) {
  const {store, scope, start} = task;
  /* Initialize the store. */
  store.dispatch({type: scope.init, ...options});
  if ('initialState' in options) {
    store.dispatch({type: scope.statePulled, ...options.initialState});
  }
  /* Start the sagas. */
  start();
};

export function mountTask (task, container, options) {
  const {store, scope} = task;
  let App = scope.App;
  if (typeof options.wrapper === 'function') {
    App = options.wrapper(App);
  }
  ReactDOM.render(<Provider store={store}><App/></Provider>, container);
};
