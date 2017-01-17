
import {use, defineAction, addSaga, addReducer, defineSelector, defineView} from 'epic-linker';
import React from 'react';
import EpicComponent from 'epic-component';

export default function* (deps) {

  /* The 'Workspace' view is provided by the task. */
  yield use('Workspace');

  yield defineAction('workspaceLoaded', 'Workspace.Loaded');
  yield defineAction('workspaceSaved', 'Workspace.Saved');

  function WorkspaceTabSelector (state, props) {
    const ops = state.workspaceOperations;
    const isWorkspaceReady = ops.isWorkspaceReady(state);
    return {isWorkspaceReady};
  }

  yield addReducer('init', function (state, action) {
    return {...state,
      isWorkspaceLoading: true,
      isWorkspaceUnsaved: false
    };
  });

  yield defineView('WorkspaceTab', WorkspaceTabSelector, EpicComponent(self => {

    self.render = function () {
      const {isWorkspaceReady} = self.props;
      if (!isWorkspaceReady) {
        return <div>{"Chargement en cours..."}</div>;
      }
      return <deps.Workspace/>;
    };

  }));

  /* workspaceLoaded occurs when a workspace dump is reloaded. */
  yield addReducer('workspaceLoaded', function (state, action) {
    const ops = state.workspaceOperations;
    state = ops.workspaceLoaded(state, action.dump);
    return {...state, isWorkspaceLoading: false};
  });

  /* workspaceSaved occurs when a workspace dump has been successfuly
     sent to the backend. */
  yield addReducer('workspaceSaved', function (state, action) {
    return {...state, isWorkspaceUnsaved: false};
  });

};
