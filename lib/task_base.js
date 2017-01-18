
import {use, defineAction, addReducer, addSaga, defer} from 'epic-linker';
import {call, put, take} from 'redux-saga/effects';

export default function* (deps) {

  yield defineAction('statePulled', 'State.Pulled');  // state pulled from host
  yield defineAction('statePushed', 'State.Pushed');  // state pushed by host

  /* The task can be loaded in two ways.
     1. Production workflow: a saga sends the 'pullState' action to the parent
        window and dispatches a 'statePulled' action when it receives a result.
     2. Development workflow: the 'statePulled' is dispatched manually when
        the tasks load.
   */

  yield use('peer');

  if (window !== window.parent) {
    yield addSaga(function* () {
      const payload = yield call(deps.peer.call, window.parent, 'pullState');
      yield put({type: deps.statePulled, ...payload});
    });
  }

  yield addReducer('statePulled', function (state, action) {
    const {task, full_task, revision, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    state = ops.taskLoaded(state);  // initial setup
    if (revision) {
      state = ops.workspaceLoaded(state, revision.state);
    }
    return state;
  });

  /* Handle a push update of the task from the platform. */

  yield defer(function () {
    deps.peer.on('pushState', function* (payload) {
      yield put({type: deps.statePushed, ...payload});
    });
  });

  yield addReducer('statePushed', function (state, action) {
    const {task, full_task, revision, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    state = ops.taskUpdated(state);  // update task
    // TODO: load the workspace from revision if we requested it
    return state;
  });

};