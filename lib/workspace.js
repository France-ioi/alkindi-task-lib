
import React from 'react';
import EpicComponent from 'epic-component';

export default function (bundle, deps) {

  /* The 'Workspace' view is provided by the task. */
  bundle.use('Workspace');

  bundle.defineAction('workspaceLoaded', 'Workspace.Loaded');
  bundle.defineAction('workspaceSaved', 'Workspace.Saved');

  function WorkspaceTabSelector (state, props) {
    const ops = state.workspaceOperations;
    const isWorkspaceReady = ops.isWorkspaceReady(state);
    return {isWorkspaceReady};
  }

  bundle.addReducer('init', function (state, action) {
    return {...state,
      workspaceDump: null,
      isWorkspaceLoading: true,
      isWorkspaceUnsaved: false
    };
  });

  /* workspaceLoaded occurs when a workspace dump is reloaded. */
  bundle.addReducer('workspaceLoaded', function (state, action) {
    const ops = state.workspaceOperations;
    const workspaceDump = action.dump;
    state = {...state, workspaceDump, isWorkspaceLoading: false, isWorkspaceUnsaved: true};
    return ops.workspaceLoaded(state, workspaceDump);
  });

  /* workspaceSaved occurs when a workspace dump has been successfuly
     sent to the backend. */
  bundle.addReducer('workspaceSaved', function (state, action) {
    return {...state, isWorkspaceUnsaved: false};
  });

  bundle.defineView('WorkspaceTab', WorkspaceTabSelector, EpicComponent(self => {

    self.render = function () {
      const {isWorkspaceReady} = self.props;
      if (!isWorkspaceReady) {
        return <div>{"Chargement en cours..."}</div>;
      }
      return <deps.Workspace/>;
    };

  }));

};
