
import {eventChannel, END, buffers} from 'redux-saga'

export default MessageChannel;

function MessageChannel (target) {

  // 'window' is the default target.
  target = target || window;

  return eventChannel(function (emitter) {
    function closeHandler () {
      cleanup();
      emitter(END);
    }
    function messageHandler (event) {
      var message;
      if (typeof event.data === 'string') {
        try {
          message = JSON.parse(event.data);
        } catch (ex) {
          // silently ignored
        }
        if (typeof message === 'object') {
          const {source, origin} = event;
          emitter({message, source, origin});
        }
      }
    }
    function cleanup () {
      target.removeEventListener('close', closeHandler);
      target.removeEventListener('message', messageHandler);
    }
    target.addEventListener('close', closeHandler);
    target.addEventListener('message', messageHandler);
    return cleanup;
  }, buffers.expanding(3));

}
