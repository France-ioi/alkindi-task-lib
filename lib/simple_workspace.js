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
import {use, addReducer, defineSelector, defineView} from 'epic-linker';

export default function WorkspaceBuilder (impl) {

  return function* (deps) {

    yield use(
      'workspaceInitialized', 'workspaceLoaded', 'workspaceChanged',
      'workspaceSaved', 'taskLoaded');

    yield defineSelector('isWorkspaceLoaded', function (state) {
      return !!state.workspace;
    });

    yield defineSelector('isWorkspaceChanged', function (state) {
      return state.workspace === state.lastSavedWorkspace;
    });

    yield defineSelector('dumpWorkspace', function (state) {
      return impl.dump(state.workspace);
    });

    /* workspaceInitialized occurs when the workspace is initialized the first
       time it is to be displayed. */
    yield addReducer('workspaceInitialized', function (state, action) {
      const {task} = state;
      const workspace = impl.init(task);
      return {
        ...state,
        workspace,
        lastSavedWorkspace: workspace
      };
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

    yield addReducer('taskLoaded', function (state, action) {
      // If the workspace is loaded, update the root scope when the task
      // changes (this happens when a hint is received).
      if (state.workspace && action.task) {
        const workspace = impl.update(action.task, state.workspace);
        state = {...state, workspace};
      }
      return state;
    });

    yield defineSelector('WorkspaceSelector', function (state) {
       const {score, task, workspace} = state;
       return {score, task, workspace};
    });
    yield defineView('Workspace', 'WorkspaceSelector', EpicComponent(self => {

      self.render = function () {
        const {score, task, workspace, dispatch} = self.props;
        if (!workspace) {
          return <div>Workspace not loaded.</div>;
        }
        return <impl.View score={score} task={task} workspace={workspace} dispatch={dispatch}/>;
      };

    }));

  };

};
