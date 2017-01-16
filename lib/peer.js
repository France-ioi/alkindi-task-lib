
import {takeEvery, call, put, take} from 'redux-saga/effects';
import {channel, buffers} from 'redux-saga'

import MessageChannel from './message_channel';

export default Peer;

const isDev = process.env.NODE_ENV !== 'production';

function Peer () {

  const actionMap = {};
  let nextChannelId = 0;
  const channelMap = [];
  const messageChannel = MessageChannel(window);

  function* handleMessage (event) {
    const {message, source, origin} = event;
    if (isDev) {
      console.log('message from platform', source, message);
    }
    const {action, targetId, sourceId} = message;
    // A result message has shape {targetId, result}.
    if (targetId !== undefined) {
      const {result} = message;
      const chan = channelMap[targetId];
      if (chan) {
        yield put(chan, {result});
        delete channelMap[targetId];
      }
      return;
    }
    // An action message has shape {action, payload, sourceId?}.
    if (action !== undefined) {
      const {payload, sourceId} = message;
      let result;
      if (action in actionMap) {
        result = yield call(actionMap[action], payload);
      } else {
        result = 'huh?';
      }
      if (sourceId !== undefined) {
        source.postMessage(JSON.stringify({targetId: sourceId, result}), origin);
      }
    }
  }

  function addAction (name, saga) {
    actionMap[name] = saga;
  }

  function* handleIncomingActions () {
    yield takeEvery(messageChannel, handleMessage);
  }

  function nameChannel (chan) {
    const channelId = nextChannelId;
    nextChannelId += 1;
    channelMap[channelId] = chan;
    return channelId;
  }

  function* doCall (target, action, payload) {
    const chan = yield call(channel, buffers.fixed(1));
    const sourceId = nameChannel(chan);
    target.postMessage(JSON.stringify({action, payload, sourceId}), "*");
    const {result} = yield take(chan);
    chan.close();
    return result;
  }

  return {on: addAction, call: doCall, handleIncomingActions};
}
