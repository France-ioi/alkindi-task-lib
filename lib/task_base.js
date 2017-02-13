
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

  if (window !== window.parent) {
    bundle.addSaga(function* () {
      const payload = yield call(deps.peer.call, window.parent, 'pullState');
      yield put({type: deps.statePulled, ...payload});
    });
  }

  bundle.use('peer');
  bundle.defer(function () {
    deps.peer.on('pushState', function* (payload) {
      yield put({type: deps.statePushed, ...payload});
    });
  });

  bundle.addReducer('statePulled', function (state, action) {
    const {task, full_task, score} = action;
    state = {...state, task, full_task, score};
    return state.workspaceOperations.taskLoaded(state);
  });

  bundle.addReducer('statePushed', function (state, action) {
    let updateTask = false, updateWorkspace = false;
    state = {...state};
    if ('view' in action) {
      state.view = action.view;
    }
    if ('score' in action) {
      state.score = action.score;
    }
    if ('task' in action) {
      state.task = action.task;
      updateTask = true;
    }
    const ops = state.workspaceOperations;
    if (updateTask) {
      state = ops.taskUpdated(state);
    }
    return state;
  });

  /* After a hint is granted a taskUpdated action is dispatched */
  bundle.addReducer('taskUpdated', function (state, action) {
    state = {...state, task: action.task};
    return state.workspaceOperations.taskUpdated(state);
  });

  /* If a statePulled/statePushed action includes a revision,
     dispatch a workspaceLoaded action. */
  bundle.use('workspaceLoaded');
  bundle.addSaga(function* () {
    yield takeLatest([deps.statePulled, deps.statePushed], function* (action) {
      const {revision} = action;
      if (typeof revision === 'object') {
        yield put({type: deps.workspaceLoaded, revisionId: revision.id, dump: revision.state});
      }
    });
  });

};