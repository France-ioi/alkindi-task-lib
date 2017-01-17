
import {use, defineAction, addReducer, addSaga} from 'epic-linker';
import {takeEvery, put, take, call} from 'redux-saga/effects';

export default function* (deps) {

  yield use('peer');

  yield defineAction('showHintRequest', 'Hint.ShowRequest');
  yield defineAction('requestHint', 'Hint.Request');

  yield defineAction('hintRequestPending', 'Hint.Request.Pending');
  yield defineAction('hintRequestFulfilled', 'Hint.Request.Fulfilled');
  yield defineAction('hintRequestRejected', 'Hint.Request.Rejected');

  yield addReducer('showHintRequest', function (state, action) {
    const {request} = action;
    return {...state, hintRequest: request, hintRequestError: undefined};
  });

  yield addReducer('hintRequestPending', function (state, action) {
    return {...state, hintRequest: action.error};
  });

  yield addReducer('hintRequestFulfilled', function (state, action) {
    return {...state, hintRequest: undefined, hintRequestError: undefined};
  });

  yield addReducer('hintRequestRejected', function (state, action) {
    return {...state, hintRequestError: action.error};
  });

  yield addSaga(function* () {
    yield takeEvery(deps.requestHint, function* (action) {
      yield put({type: deps.hintRequestPending});
      let result;
      if (window.parent) {
        result = yield call(deps.peer.call, window.parent, 'requestHint', action.request);
      } else {
        // TODO: bypass platform and contact task backend directly
        result = {success: false, error: 'not implemented'};
      }
      if (result.success) {
        yield put({type: deps.hintRequestFulfilled});
      } else {
        yield put({type: deps.hintRequestRejected, error: result.error});
      }
    });
  });

};
