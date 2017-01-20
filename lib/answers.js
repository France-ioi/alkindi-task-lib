
import {takeEvery, put, take, call, select} from 'redux-saga/effects';

export default function (bundle, deps) {

  bundle.use('peer', 'saveWorkspaceSelector');

  bundle.defineAction('submitAnswer', 'Answer.Submit');
  bundle.defineAction('submitAnswerPending', 'Answer.Submit.Pending');
  bundle.defineAction('submitAnswerFulfilled', 'Answer.Submit.Fulfilled');
  bundle.defineAction('submitAnswerRejected', 'Answer.Submit.Rejected');
  bundle.defineAction('dismissAnswerFeedback', 'Answer.Submit.DismissFeedback');

  bundle.addSaga(function* () {
    yield takeEvery(deps.submitAnswer, function* (action) {
      const now = new Date().toLocaleString();
      yield put({type: deps.submitAnswerPending});
      const data = yield select(deps.saveWorkspaceSelector, {now});
      const payload = {answer: action.answer, data: data};
      let result;
      if (window.parent) {
        result = yield call(deps.peer.call, window.parent, 'submitAnswer', payload);
      } else {
        // TODO: bypass platform and contact task backend directly
        result = {success: false, error: 'not implemented'};
      }
      let {success, error, score, feedback} = result;
      if (success) {
        yield put({type: deps.submitAnswerFulfilled, feedback, score});
      } else {
        yield put({type: deps.submitAnswerRejected, error});
      }
    });
  });

  /* Clear the answer feedback when the user changes the active tab. */
  bundle.addReducer('viewSelected', function (state, action) {
    if (state.submitAnswer && state.submitAnswer.status === 'pending') {
      return state;
    }
    return {...state, submitAnswer: {}};
  });

  bundle.addReducer('submitAnswerPending', function (state, action) {
    return {...state, submitAnswer: {status: 'pending'}};
  });

  bundle.addReducer('submitAnswerFulfilled', function (state, action) {
    const {feedback, score} = action;
    return {...state,
      submitAnswer: {status: 'fulfilled', feedback, score},
      saveWorkspace: {status: 'fulfilled'},
      isWorkspaceUnsaved: false
    };
  });

  bundle.addReducer('submitAnswerRejected', function (state, action) {
    const {error} = action;
    return {...state, submitAnswer: {status: 'rejected', error}};
  });

  bundle.addReducer('dismissAnswerFeedback', function (state, action) {
    return {...state, submitAnswer: {}};
  });

};
