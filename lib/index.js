
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import link from 'epic-linker';

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
  /* For development, publish the task. */
  if (process.env.NODE_ENV !== 'production') {
    window.task = task;
  }
};

export function linkTask (TaskBundle) {
  return link(function (bundle) {
    bundle.include(AppBundle);
    bundle.include(WorkspaceBundle);
    bundle.include(SaveBundle);
    bundle.include(AnswersBundle);
    bundle.include(HintsBundle);
    bundle.include(TaskBaseBundle);
    bundle.include(TaskBundle);
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
