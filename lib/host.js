
import React from 'react';
import {Tabs, TabList, Tab, TabPanel} from 'react-tabs';
import EpicComponent from 'epic-component';
import {use, defineAction, defineSelector, defineView, addReducer, addSaga} from 'epic-linker';
import {takeEvery, takeLatest, select, put, take, call} from 'redux-saga/effects';

import Peer from './peer';

const isDev = process.env.NODE_ENV !== 'production';

export default function* (deps) {

  // Use views defined in the task bundle:
  yield use('Task', 'Workspace');
  const views = [
    {key: 'task', title: "Énoncé", component: 'Task'},
    {key: 'solve', title: "Résoudre", component: 'Workspace'},
    {key: 'history', title: "Historique", component: 'History', disabled: true},
    {key: 'answers', title: "Réponses", component: 'Answers', disabled: true}
  ];

  // Interface with the outside world.
  const peer = Peer();
  yield addSaga(peer.handleIncomingActions);

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
    return {...state, view: action.view, feedback: undefined};
  });

  /* If we have a parent, call 'initTask' on it and dispatch a 'taskLoad'
     action with the result. */
  yield addSaga(function* () {
    if (window.parent) {
      const init = yield call(peer.call, window.parent, 'initTask');
      yield put({type: deps.taskLoaded, ...init});
    }
  });

  yield defineAction('taskLoaded', 'Task.Loaded');
  yield defineAction('taskUpdated', 'Task.Updated');
  yield addReducer('taskLoaded', taskLoaded);
  yield addReducer('taskUpdated', taskLoaded);
  function taskLoaded (state, action) {
    const {task, full_task, score} = action;
    return {...state, task, full_task, score};
  }

  yield defineAction('scoreChanged', 'Score.Changed');
  yield addReducer('scoreChanged', function (state, action) {
    const {feedback, score} = action;
    state = {...state, feedback};
    if (score !== undefined) {
      state.score = score;
    }
    return state;
  });

  // Workspace actions.
  yield defineAction('workspaceLoaded', 'Workspace.Loaded');
  yield defineAction('workspaceChanged', 'Workspace.Changed');
  yield defineAction('workspaceSaved', 'Workspace.Saved');

  yield defineSelector('AppSelector', function (state) {
    const {view, task} = state;
    return {view, task};
  });

  yield defineView('App', 'AppSelector', EpicComponent(self => {
    function selectTab (index) {
      const key = views[index].key;
      self.props.dispatch({type: deps.viewSelected, view: key});
    }
    self.render = function () {
      const {task, view} = self.props;
      if (!task) {
        return <div style={{padding: '20px', fontSize: '32px'}}><i className="fa fa-spinner fa-spin"/></div>;
      }
      const viewIndex = views.findIndex(t => t.key === view);
      return (
        <Tabs onSelect={selectTab} selectedIndex={viewIndex}>
          <TabList>
            {views.map(t => <Tab key={t.key} disabled={t.disabled}>{t.title}</Tab>)}
          </TabList>
          {views.map(t =>
            <TabPanel key={t.key}>
              <div>
                {t.key === view && React.createElement(deps[t.component])}
              </div>
            </TabPanel>)}
        </Tabs>
      );
    };
  }));

  //
  // Handle requesting hints
  //

  yield defineAction('requestHint', 'Hint.Request');
  yield defineAction('hintRequestPending', 'Hint.Request.Pending');
  yield defineAction('hintRequestFulfilled', 'Hint.Request.Fulfilled');
  yield defineAction('hintRequestRejected', 'Hint.Request.Rejected');
  yield addSaga(function* () {
    yield takeEvery(deps.requestHint, function* (action) {
      let result;
      if (window.parent) {
        result = yield call(peer.call, window.parent, 'requestHint', action.request);
      } else {
        // TODO: bypass platform and contact task backend directly
        result = {success: false, error: 'not implemented'};
      }
      if (isDev) {
        console.log('request hint result', result);
      }
      if (result.success) {
        yield put({type: deps.hintRequestFulfilled});
      } else {
        yield put({type: deps.hintRequestRejected, error: result.error});
      }
    });
  });

  //
  // Handle submitting answers
  //

  yield defineAction('submitAnswer', 'Answer.Submit');
  yield defineAction('submitAnswerPending', 'Answer.Submit.Pending');
  yield defineAction('submitAnswerFulfilled', 'Answer.Submit.Fulfilled');
  yield defineAction('submitAnswerRejected', 'Answer.Submit.Rejected');
  yield addSaga(function* () {
    yield takeEvery(deps.submitAnswer, function* (action) {
      let result;
      if (window.parent) {
        result = yield call(peer.call, window.parent, 'submitAnswer', action.answer);
      } else {
        // TODO: bypass platform and contact task backend directly
        result = {success: false, error: 'not implemented'};
      }
      if (isDev) {
        console.log('submit answer result', result);
      }
      let {success, error, score, feedback} = result;
      if (success) {
        yield put({type: deps.submitAnswerFulfilled});
      } else {
        yield put({type: deps.submitAnswerRejected});
        score = undefined;
        feedback = error;
      }
      yield put({type: deps.scoreChanged, score, feedback}); // XXX clean up
    });
  });

  //
  // Handle a push update of the task from the platform.
  //
  peer.on('updateTask', function * (payload) {
    yield put({type: deps.taskUpdated, ...payload});
  });

};
