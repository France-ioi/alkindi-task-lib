
import {takeEvery, put, take, call, select} from 'redux-saga/effects';
import superagent from 'superagent';

export default function (bundle, deps) {

  bundle.use('peer', 'taskUpdated');

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

  bundle.defer(function () {
    const {peer} = deps;
    /* DEV support: pass hint requests directly to the task backend.
       The task sends this message to itself when it has no parent window. */
    peer.on('requestHint', function* requestHint (query) {
      let result;
      const taskBaseUrl = yield select(state => state.taskBaseUrl);
      const data = yield select(getGrantHintData, query);
      try {
        result = yield call(grantHint, taskBaseUrl, data);
        if (result.success) {
          yield put({type: deps.taskUpdated, task: result.task});
        }
      } catch (ex) {
        return {success: false, error: 'server error'};
      }
      return result;
    });
  });


};

function getGrantHintData (state, query) {
  const {full_task, task} = state;
  return {full_task, task, query};
}

function grantHint (base, data) {
  return new Promise(function (resolve, reject) {
    var req = superagent.post(`${base}/grantHint`);
    req.set('Accept', 'application/json');
    req.send(data);
    req.end(function (err, res) {
      if (err || !res.ok)
        return reject({err, res});
      resolve(res.body);
    });
  });
}
