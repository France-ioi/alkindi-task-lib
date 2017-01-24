
import {call, put, take, select, takeLatest} from 'redux-saga/effects';

export default function (bundle, deps) {

  bundle.defineAction('statePulled', 'State.Pulled');  // state pulled from host
  bundle.defineAction('statePushed', 'State.Pushed');  // state pushed by host
  bundle.defineAction('taskUpdated', 'Task.Updated');

  /* The task can be loaded in two ways.
     1. Production workflow: a saga sends the 'pullState' action to the parent
        window and dispatches a 'statePulled' action when it receives a result.
     2. Development workflow: the 'statePulled' is dispatched manually when
        the tasks load.
   */

  bundle.use('peer');

  if (window !== window.parent) {
    bundle.addSaga(function* () {
      const payload = yield call(deps.peer.call, window.parent, 'pullState');
      yield put({type: deps.statePulled, ...payload});
    });
  }

  bundle.addReducer('statePulled', function (state, action) {
    const {task, full_task, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    state = ops.taskLoaded(state);
    return state;
  });

  bundle.addReducer('taskUpdated', function (state, action) {
    state = {...state, task: action.task};
    return state.workspaceOperations.taskLoaded(state);
  });

  /* If the statePulled action includes a state dump, cause it to load by
     dispatching a workspaceLoaded action. */
  bundle.use('workspaceLoaded');
  bundle.addSaga(function* () {
    yield takeLatest(deps.statePulled, function* (action) {
      const {revision} = action;
      const dump = revision && revision.state;
      if (dump) {
        yield put({type: deps.workspaceLoaded, dump});
      }
    });
  });

  /* Handle a push update of the task from the platform. */

  bundle.defer(function () {
    deps.peer.on('pushState', function* (payload) {
      yield put({type: deps.statePushed, ...payload});
    });
  });

  bundle.addReducer('statePushed', function (state, action) {
    const {task, full_task, revision, score} = action;
    state = {...state, task, full_task, score};
    const ops = state.workspaceOperations;
    state = ops.taskUpdated(state);  // update task
    // TODO: load the workspace from revision if we requested it
    return state;
  });

};