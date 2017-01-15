
import React from 'react';
import EpicComponent from 'epic-component';
import {use, defineAction, defineSelector, defineView, addReducer, addSaga} from 'epic-linker';
import {eventChannel, END, buffers} from 'redux-saga'
import {takeLatest, select, put, take, call} from 'redux-saga/effects';

import MessageChannel from './message_channel';

export default function* (deps) {

  // Use views defined in the task bundle:
  yield use('Task', 'Workspace');

  // Standard selector for the 'Task' view.
  yield defineSelector('TaskSelector', function (state) {
     const {task} = state;
     return {task};
  });

  // Standard selector for the 'AnswerDialog' view.
  yield defineSelector('AnswerDialogSelector', function (state, props) {
    const {feedback} = state;
    const submit = function (answer) {
      props.dispatch({type: deps.answerSubmitted, answer});
    }
    const onSuccess = function () {
      props.dispatch({type: deps.taskCompleted});
    };
    return {submit, feedback, onSuccess};
  });

  yield defineAction('init', 'Init');
  yield addReducer('init', function (state, _action) {
    return {
      view: 'task'
    };
  });

  yield defineAction('viewSelected', 'View.Selected');
  yield addReducer('viewSelected', function (state, action) {
    return {...state, view: action.view};
  });

  yield defineAction('taskLoaded', 'Task.Loaded');
  yield addReducer('taskLoaded', function (state, action) {
    return {...state, task: action.task, full_task: action.full_task};
  });

  yield defineAction('scoreChanged', 'Score.Changed');
  yield addReducer('scoreChanged', function (state, action) {
    return {...state, score: action.score};
  });

  // Hints
  yield defineAction('requestHint', 'Hint.Request');

  // Workspace actions.
  yield defineAction('workspaceInitialized', 'Workspace.Init');
  yield defineAction('workspaceLoaded', 'Workspace.Loaded');
  yield defineAction('workspaceChanged', 'Workspace.Changed');
  yield defineAction('workspaceSaved', 'Workspace.Saved');

  yield use('isWorkspaceLoaded');
  yield addSaga(function* () {
    /* When the 'workspace' view is selected, initialize the workspace if needed. */
    yield takeLatest(deps.viewSelected, function* (action) {
      if (action.view === 'workspace') {
        const loaded = yield select(deps.isWorkspaceLoaded);
        const task = yield select(state => state.task);
        if (!loaded && task) {
          yield put({type: deps.workspaceInitialized});
        }
      }
    });
  });
  yield addSaga(function* () {
    /* When the task is loaded, initialize the workspace. */
    yield takeLatest(deps.taskLoaded, function* (action) {
      yield put({type: deps.workspaceInitialized});
    });
  });


  yield defineSelector('AppSelector', function (state) {
    const {view, task} = state;
    return {view, task};
  });

  yield defineView('App', 'AppSelector', EpicComponent(self => {
    self.render = function () {
      const {task, view, workspace} = self.props;
      if (!task) {
        return <div style={{padding: '20px', fontSize: '32px'}}><i className="fa fa-spinner fa-spin"/></div>;
      }
      switch (view) {
        case 'task':
          return <deps.Task/>;
        case 'workspace':
          return <deps.Workspace/>;
        case 'answer':
          return <deps.AnswerDialog/>;
        default:
          return <p>Undefined view {view}</p>;
      }
    };
  }));

  const remoteActions = {};

  remoteActions.loadTask = function* (message) {
    console.log('loading task', message);
    yield put({type: deps.taskLoaded, task: message.task});
    return true;
  };

  yield addSaga(function* () {
    while (true) {
      const {message, source, origin} = yield take(MessageChannel());
      const response = {id: message.id};
      if (!message.action || !remoteActions[message.action]) {
        response.error = 'huh?';
      } else {
        response.result = yield call(remoteActions[message.action], message);
      }
      source.postMessage(JSON.stringify(response), origin);
    }
  });

};
