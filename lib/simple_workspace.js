/*

This files contains a simple workspace implementation.

Call the builder with an impl object containing these functions:

* impl.init(task) -> workspace

  Returns a workspace initialized for the given task object.

* impl.dump(workspace)

  Returns a JSON-serializable dump of the given workspace.

* impl.load(task, dump)

  Returns a workspace initialized for the given task object and persistent
  state dump.

* impl.update(task, workspace)

  Returns a workspace updated to reflect a new task object (the task object
  changes when hints are obtained).

* impl.View

  React component with props {score, task, workspace, dispatch}, where
  - score is the current score,
  - task is the current task object,
  - workspace is the current workspace object,
  - dispatch is the redux dispatch function.

*/

import React from 'react';
import EpicComponent from 'epic-component';
import {use, addReducer, defineAction, defineSelector, defineView} from 'epic-linker';

export default function WorkspaceBuilder (impl) {

  return function* (deps) {

    yield use(
      'taskLoaded',
      'taskUpdated',
      'workspaceLoaded',
      'workspaceChanged',
      'workspaceSaved',
      'hintRequestFulfilled',
      'hintRequestRejected'
    );

    yield defineSelector('isWorkspaceChanged', function (state) {
      return state.workspace === state.lastSavedWorkspace;
    });

    yield defineSelector('dumpWorkspace', function (state) {
      return impl.dump(state.workspace);
    });

    /* Initialize the workspace when the task is loaded. */
    yield addReducer('taskLoaded', function (state, action) {
      const workspace = impl.init(action.task);
      return {
        ...state,
        workspace,
        lastSavedWorkspace: workspace
      };
    });

    /* Update the workspace when the task is updated. */
    yield addReducer('taskUpdated', function (state, action) {
      if (state.workspace && action.task) {
        const workspace = impl.update(action.task, state.workspace);
        const lastSavedWorkspace = updateLastSavedWorkspace(state, workspace);
        state = {...state, workspace, lastSavedWorkspace};
      }
      return state;
    });

    /* workspaceLoaded occurs when a workspace dump is reloaded. */
    yield addReducer('workspaceLoaded', function (state, action) {
      let workspace = impl.load(action.dump);
      if (state.task) {
        workspace = impl.update(state.task, workspace);
      }
      return {
        ...state,
        workspace,
        lastSavedWorkspace: workspace
      };
    });

    /* workspaceSaved occurs when a workspace dump has been successfuly
       sent to the backend. */
    yield addReducer('workspaceSaved', function (state, action) {
      return {
        ...state,
        lastSavedWorkspace: state.workspace
      };
    });

    function updateLastSavedWorkspace (state, workspace) {
      if (state.lastSavedWorkspace === state.workspace) {
        /* There were no unsaved changes, return the new workspace so that
           there are still no unsaved changes after the update. */
        return workspace;
      } else {
        /* There were unsaved changes, preserve the last saved workspace. */
        return state.lastSavedWorkspace;
      }
    }

    yield defineAction('showHintRequest', 'Hint.ShowRequest');
    yield addReducer('showHintRequest', function (state, action) {
      const {request} = action;
      return {...state, hintRequest: request};
    });

    yield addReducer('hintRequestFulfilled', function (state, action) {
      return {...state, hintRequest: undefined};
    });

    yield addReducer('hintRequestRejected', function (state, action) {
      return {...state, hintRequestError: action.error};
    });

    yield defineSelector('WorkspaceSelector', function (state) {
       const {score, feedback, task, workspace, hintRequest} = state;
       return {score, feedback, task, workspace, hintRequest};
    });
    yield defineView('Workspace', 'WorkspaceSelector', EpicComponent(self => {

      self.render = function () {
        const {score, feedback, task, workspace, hintRequest, dispatch} = self.props;
        if (!workspace) {
          return <div>Workspace not loaded.</div>;
        }
        return <impl.View score={score} feedback={feedback} task={task} workspace={workspace} dispatch={dispatch} hintRequest={hintRequest}/>;
      };

    }));

  };

};
