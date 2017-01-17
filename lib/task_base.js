
import {use, defineAction, addReducer, addSaga, defer} from 'epic-linker';
import {call, put, take} from 'redux-saga/effects';

export default function* (deps) {

  yield defineAction('taskLoaded', 'Task.Loaded');
  yield defineAction('taskUpdated', 'Task.Updated');

  /* The task can be loaded in two ways.
     1. Production workflow: a saga sends the 'initTask' action to the parent
        window and dispatches a 'taskLoaded' action when it receives a result.
     2. Development workflow: the 'taskLoaded' is dispatched manually when
        the tasks load.
   */

  yield use('peer');

  if (window.parent) {
    yield addSaga(function* () {
      const init = yield call(deps.peer.call, window.parent, 'initTask');
      yield put({type: deps.taskLoaded, ...init});
    });
  }

  yield addReducer('taskLoaded', function (state, action) {
    const {task, full_task, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    return ops.taskLoaded(state);
  });

  /* Handle a push update of the task from the platform. */

  yield defer(function () {
    deps.peer.on('updateTask', function* (payload) {
      yield put({type: deps.taskUpdated, ...payload});
    });
  });

  yield addReducer('taskUpdated', function (state, action) {
    const {task, full_task, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    return ops.taskUpdated(state);
  });

};