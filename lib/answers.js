
import {use, defineAction, addSaga, addReducer} from 'epic-linker';
import {takeEvery, put, take, call, select} from 'redux-saga/effects';

export default function* (deps) {

  yield use('peer');

  yield defineAction('submitAnswer', 'Answer.Submit');
  yield defineAction('submitAnswerPending', 'Answer.Submit.Pending');
  yield defineAction('submitAnswerFulfilled', 'Answer.Submit.Fulfilled');
  yield defineAction('submitAnswerRejected', 'Answer.Submit.Rejected');
  yield defineAction('dismissAnswerFeedback', 'Answer.Submit.DismissFeedback');

  yield addSaga(function* () {
    yield takeEvery(deps.submitAnswer, function* (action) {
      let result;
      yield put({type: deps.submitAnswerPending});
      if (window.parent) {
        result = yield call(deps.peer.call, window.parent, 'submitAnswer', action.answer);
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
  yield addReducer('viewSelected', function (state, action) {
    if (state.submitAnswer && state.submitAnswer.status === 'pending') {
      return state;
    }
    return {...state, submitAnswer: {}};
  });

  yield addReducer('submitAnswerPending', function (state, action) {
    return {...state, submitAnswer: {status: 'pending'}
    };
  });

  yield addReducer('submitAnswerFulfilled', function (state, action) {
    const {feedback, score} = action;
    return {...state, submitAnswer: {status: 'fulfilled', feedback, score}};
  });

  yield addReducer('submitAnswerRejected', function (state, action) {
    const {error} = action;
    return {...state, submitAnswer: {status: 'rejected', error}};
  });

  yield addReducer('dismissAnswerFeedback', function (state, action) {
    return {...state, submitAnswer: {}};
  });

};
