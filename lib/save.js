
import {takeLatest, take, put, call, select} from 'redux-saga/effects';
import React from 'react';
import EpicComponent from 'epic-component';
import {Button} from 'react-bootstrap';

import Tooltip from './ui/tooltip';

export default function (bundle, deps) {

  bundle.use('peer');

  bundle.defineAction('saveWorkspace', 'Workspace.Save');

  bundle.defineAction('saveWorkspacePending', 'Workspace.Save.Pending');
  bundle.defineAction('saveWorkspaceFulfilled', 'Workspace.Save.Fulfilled');
  bundle.defineAction('saveWorkspaceRejected', 'Workspace.Save.Rejected');

  bundle.addReducer('saveWorkspacePending', function (state, action) {
    // Eagerly clear the unsaved flag.
    return {...state,
      saveWorkspace: {status: 'pending'},
      isWorkspaceUnsaved: false
    };
  });

  bundle.addReducer('saveWorkspaceFulfilled', function (state, action) {
    const {workspaceRevisionId} = action;
    return {...state,
      saveWorkspace: {status: 'fulfilled'},
      workspaceRevisionId
    };
  });

  bundle.addReducer('saveWorkspaceRejected', function (state, action) {
    return {...state,
      saveWorkspace: {status: 'rejected', error: action.error},
      isWorkspaceUnsaved: true
    };
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
        yield put({type: deps.saveWorkspaceFulfilled, workspaceRevisionId: result.revision_id});
      } else {
        yield put({type: deps.saveWorkspaceRejected, error: result.error});
      }
    });
  });

  bundle.defineSelector('saveWorkspaceSelector', saveWorkspaceSelector);
  function saveWorkspaceSelector (state, props) {
    const ops = state.workspaceOperations;
    return {
      title: `Révision du ${props.now}`,
      parent_id: state.workspaceRevisionId,
      state: ops.dumpWorkspace(state)
    };
  }

  function SaveButtonSelector (state, props) {
    const {isWorkspaceUnsaved} = state;
    return {isWorkspaceUnsaved};
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
