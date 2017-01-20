
import {takeEvery, put, take, call} from 'redux-saga/effects';

export default function (bundle, deps) {

  bundle.use('peer');

  bundle.defineAction('showHintRequest', 'Hint.ShowRequest');
  bundle.defineAction('requestHint', 'Hint.Request');

  bundle.defineAction('hintRequestPending', 'Hint.Request.Pending');
  bundle.defineAction('hintRequestFulfilled', 'Hint.Request.Fulfilled');
  bundle.defineAction('hintRequestRejected', 'Hint.Request.Rejected');

  bundle.addReducer('showHintRequest', function (state, action) {
    const {request} = action;
    return {...state, hintRequest: request, hintRequestError: undefined};
  });

  bundle.addReducer('hintRequestPending', function (state, action) {
    return {...state, hintRequest: action.error};
  });

  bundle.addReducer('hintRequestFulfilled', function (state, action) {
    return {...state, hintRequest: undefined, hintRequestError: undefined};
  });

  bundle.addReducer('hintRequestRejected', function (state, action) {
    return {...state, hintRequestError: action.error};
  });

  bundle.addSaga(function* () {
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
