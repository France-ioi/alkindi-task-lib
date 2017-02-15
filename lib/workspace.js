
import {eventChannel, buffers} from 'redux-saga'
import {takeLatest, take, put, call, select} from 'redux-saga/effects';
import React from 'react';
import EpicComponent from 'epic-component';
import {Button} from 'react-bootstrap';

import Tooltip from './ui/tooltip';

export default function (bundle, deps) {

  /* The 'Workspace' view is provided by the task. */
  bundle.use('Workspace', 'peer');

  bundle.defineAction('workspaceLoaded', 'Workspace.Loaded');
  bundle.defineAction('workspaceUnsaved', 'Workspace.Unsaved');
  bundle.defineAction('saveWorkspace', 'Workspace.Save');
  bundle.defineAction('saveWorkspacePending', 'Workspace.Save.Pending');
  bundle.defineAction('saveWorkspaceFulfilled', 'Workspace.Save.Fulfilled');
  bundle.defineAction('saveWorkspaceRejected', 'Workspace.Save.Rejected');

  bundle.addReducer('init', function (state, action) {
    return {...state,
      loadedDump: null,
      revisionId: undefined
    };
  });

  bundle.addReducer('workspaceLoaded', function (state, action) {
    const {revisionId, dump} = action;
    state = {...state, loadedDump: dump, revisionId};
    return state.workspaceOperations.workspaceLoaded(state, dump);
  });

  bundle.addReducer('workspaceUnsaved', function (state, action) {
    return {...state, isWorkspaceUnsaved: action.unsaved};
  });

  bundle.addReducer('saveWorkspacePending', function (state, action) {
    // Eagerly clear the unsaved flag.
    return {...state,
      saveWorkspace: {status: 'pending'},
      isSavePending: true
    };
  });

  bundle.addReducer('saveWorkspaceFulfilled', function (state, action) {
    const {dump, revisionId} = action;
    return {...state,
      saveWorkspace: {status: 'fulfilled'},
      loadedDump: dump,
      revisionId: revisionId,
      isSavePending: false
    };
  });

  bundle.addReducer('saveWorkspaceRejected', function (state, action) {
    return {...state,
      saveWorkspace: {status: 'rejected', error: action.error},
      isSavePending: false
    };
  });

  bundle.defer(function (store) {
    let unsaved = false;
    store.subscribe(function () {
      const state = store.getState();
      const newUnsaved = state.loadedDump !== state.dump;
      if (unsaved !== newUnsaved) {
        unsaved = newUnsaved;
        store.dispatch({type: deps.workspaceUnsaved, unsaved});
      }
    });
  });

  bundle.addSaga(function* () {
    /* takeLatest will cause any pending save operation to be cancelled. */
    yield takeLatest(deps.saveWorkspace, function* (action) {
      const now = new Date().toLocaleString();
      const data = yield select(saveWorkspaceSelector, {now});
      yield put({type: deps.saveWorkspacePending});
      let result;
      if (window.parent) {
        result = yield call(deps.peer.call, window.parent, 'storeRevision', data);
      } else {
        // TODO: bypass platform and contact task backend directly
        result = {success: false, error: 'not implemented'};
      }
      if (result.success) {
        yield put({type: deps.saveWorkspaceFulfilled, revisionId: result.revision_id, dump: data.state});
      } else {
        yield put({type: deps.saveWorkspaceRejected, error: result.error});
      }
    });
  });

  bundle.defineSelector('saveWorkspaceSelector', saveWorkspaceSelector);
  function saveWorkspaceSelector (state, props) {
    return {
      title: `Révision du ${props.now}`,
      parent_id: state.revisionId,
      state: state.dump
    };
  }

  function WorkspaceTabSelector (state, props) {
    const ops = state.workspaceOperations;
    const isWorkspaceReady = ops.isWorkspaceReady(state);
    return {isWorkspaceReady};
  }

  bundle.defineView('WorkspaceTab', WorkspaceTabSelector, EpicComponent(self => {

    self.render = function () {
      const {isWorkspaceReady} = self.props;
      if (!isWorkspaceReady) {
        return <div>{"Chargement en cours..."}</div>;
      }
      return <deps.Workspace/>;
    };

  }));

  function SaveButtonSelector (state, props) {
    const {isSavePending, isWorkspaceUnsaved} = state;
    return {isWorkspaceUnsaved: isWorkspaceUnsaved && !isSavePending};
  }

  bundle.defineView('SaveButton', SaveButtonSelector, EpicComponent(self => {

    const saveStateTooltip = (
      <p>
        Enregistrez de temps en temps votre travail pour ne pas risquer de le
        perdre.
        Chaque version que vous enregistrez sera disponible pour vous et vos
        coéquipiers dans l'onglet Historique.
      </p>
    );

    function onSaveWorkspace () {
      self.props.dispatch({type: deps.saveWorkspace});
    }

    self.render = function () {
      const {showTooltip, isWorkspaceUnsaved} = self.props;
      const saveStyle = isWorkspaceUnsaved ? 'primary' : 'default';
      return (
        <div>
          <Button bsStyle={saveStyle} onClick={onSaveWorkspace}>
            <i className="fa fa-save"/>
            {' Enregistrer cette version'}
          </Button>
          <span style={{marginLeft: '10px', marginRight: '10px'}}>
            <Tooltip content={saveStateTooltip} placement='bottom'/>
          </span>
        </div>
      );
    };

  }));

};
