/* This file needs to be updated to work with the rest of the lib. */

/*

This files contains a tool-based implementation of the workspace.

A tool has a persistent state, inputs, and outputs.

A tool's inputs are passed to its `compute(state, scope)` function in a `scope`
object which the function must update with the tool's computed outputs.

A tool is displayed by a React component with receives as prop `state` the
persistent state of the tool, and as prop `scope` the scope containing the
tool's inputs and outputs.

A workspace is build by providing a `setupTools` function to `WorkspaceBuilder`,
which is called with an `addTool` callback that can be used to add tools.
The `addTool(factory, wire, initialState)` callback takes a tool factory,
a wiring function, and an initial state dump, and returns the tool's index.

A tool factory is a constructor that must at least set `this.Component` and
`this.compute`.

A wiring function takes `(scopes, scope)` where `scopes` is an array containing
the scopes of all the tools with a smaller index, must set the tool's inputs in
`scope`.
An output from an earlier tool can be supplied to the tool as input thus:
```
scope.inputProp = scopes[iEarlierTool].outputProp;
```
The scope can also be used to pass constants (such as alphabets or reference
data) to the tool.

A tool's view also receives a `dispatch` prop than can be used to dispach an
action to mutate the persistent state of the tool.  An action is an object with
at least a 'type' property.  The value of the 'type' property is used as a key
in the tool's reducers, set in the factory, to find a reducer (function taking
the tool's state and the action and returning a new state) for the action.

The following is a basic example of a tool whose 'input' property is optionnaly
incremented:

```
const ToolFactory = function () {
  this.compute = function (state, scope) {
    const {increment} = state;
    const {input} = scope;
    scope.output = input + (increment ? 1 : 0);
  };
  this.Component = EpicComponent(self => {
    const onToggle = function () {
      self.props.dispatch({type: 'Toggle'});
    };
    self.render = function() {
      const {increment} = self.props.state;
      const {input, output} = self.props.scope;
      return (
        <div>
          {input}{' + '}
          <span onClick={onToggle}>{increment ? 0 : 1}</span>
          {' = '}{output}
        </div>
      );
    };
  };
  this.reducers.Toggle = function (state, action) {
    return {...state, !state.increment};
  };
};
```

*/

import React from 'react';
import EpicComponent from 'epic-component';
import {use, defineAction, addSaga, addReducer, defineSelector, defineView} from 'epic-linker';

export default function WorkspaceBuilder (setupTools, makeRootScope) {

  return function* (deps) {

    yield defineSelector('isWorkspaceLoaded', function (state) {
      return !!state.workspace;
    });

    yield defineSelector('isWorkspaceChanged', function (state) {
      return state.unsavedChanges;
    });

    yield defineSelector('dumpWorkspace', function (state) {
      return dumpWorkspace(state.workspace);
    });

    /* workspaceInitialized occurs when the workspace is initialized the first
       time it is to be displayed. */
    yield addReducer('workspaceInitialized', function (state, action) {
      const {task} = state;
      return {
        ...state,
        workspace: makeWorkspace(setupTools),
        rootScope: makeRootScope(task),
        unsavedChanges: false
      };
    });

    /* workspaceLoaded occurs when a workspace dump is reloaded. */
    yield addReducer('workspaceLoaded', function (state, action) {
      return {
        ...state,
        workspace: loadWorkspace(state.workspace, action.dump),
        unsavedChanges: false
      };
    });

    /* workspaceSaved occurs when a workspace dump has been successfuly
       sent to the backend. */
    yield addReducer('workspaceSaved', function (state, action) {
      return {
        ...state,
        unsavedChanges: false
      };
    });

    /* taskLoaded occurs when the task is loaded (or reloaded, which happens
       when a hint is received). */
    yield addReducer('taskLoaded', function (state, action) {
      if (state.workspace && action.task) {
        // Update the root scope of the tools to reflect any new hints given
        // in the task object.
        state = {...state, rootScope: makeRootScope(action.task)};
      }
      return state;
    });

    yield defineAction('workspaceTool', 'Workspace.Tool');
    yield addReducer('workspaceTool', function (state, action) {
      const workspace = toolReducer(state.workspace, action);
      return {
        ...state,
        workspace,
        unsavedChanges: true
      };
    });

    yield defineSelector('WorkspaceSelector', function (state) {
       const {score, feedback, task, workspace, rootScope} = state;
       return {score, feedback, task, workspace, rootScope};
    });
    yield defineView('Workspace', 'WorkspaceSelector', EpicComponent(self => {

      // When a tool calls its dispatch prop with an action, a workspaceTool
      // action is dispatch with its 'subtype' set to the action's original type,
      // and the tool's index is added as 'toolIndex'.
      const toolDispatch = function (action) {
        self.props.dispatch({
          ...action,
          type: deps.workspaceTool,
          subtype: action.type,
          toolIndex: this.index
        });
      };

      // Maintain a cache of dispatch functions bound to each tool.
      let dispatchCache = new WeakMap();
      const getToolDispatch = function (tool) {
        let dispatch;
        if (dispatchCache.has(tool)) {
          dispatch = dispatchCache.get(tool);
        } else {
          dispatch = toolDispatch.bind(tool);
          dispatchCache.set(tool, dispatch);
        }
        return dispatch;
      };

      self.componentWillReceiveProps = function (nextProps) {
        // Clear the cache if the dispatch function changes.
        if (nextProps.dispatch !== self.props.dispatch) {
          dispatchCache = new WeakMap();
        }
      };

      self.render = function () {
        const {rootScope, workspace, dispatch} = self.props;
        const scopes = [];
        if (!workspace) {
          return <div>Workspace not loaded.</div>;
        }
        const renderTool = function (tool) {
          const {index, wire, compute, Component, state} = tool;
          const scope = Object.create(rootScope);
          const dispatch = getToolDispatch(tool);
          wire(scopes, scope);
          scopes.push(scope);
          compute(state, scope);
          return <Component key={index} state={state} scope={scope} dispatch={dispatch}/>;
        };
        return <div>{workspace.tools.map(renderTool)}</div>;
      };

    }));

  };


  return {
    init: initWorkspace,
    dump: dumpWorkspace,
    load: loadWorkspace,
    update: updateWorkspace,
    View: WorkspaceView
  };

};

/* Returns a workspace initialized by setupTools, which is passed an addTool
   function which takes a Tool factory, a wiring function, and the tool's
   initial state, and returns the tool's index. */
const makeWorkspace = function (setupTools) {
  const tools = [];
  const workspace = {tools};
  const addTool = function (factory, wire, initialState) {
    const index = tools.length;
    const tool = {
      index,
      wire,
      state: {},
      reducers: {},
      dump: state => state,
      load: dump => dump
    };
    factory.call(tool);
    let state = tool.load(initialState);
    tool.state = tool.initialState = state;
    tools.push(tool);
    return index;
  };
  setupTools(addTool);
  return workspace;
};

/* Returns a dump of the tool states that can be stored and passed to load. */
const dumpWorkspace = function (workspace) {
  return workspace.tools.map(function (tool) {
    return {version: 1, state: tool.dump(tool.state)};
  });
};

/* Loads a dump into a workspace. */
const loadWorkspace = function (workspace, dump) {
  const tools = workspace.tools.map(function (tool, i) {
    return {...tool, state: tool.load(dump[i].state)};
  });
  return {...workspace, tools};
};

/* Apply a task tool action (type prefixed with 'Task.Tool.'). */
const toolReducer = function (workspace, action) {
  const {tools} = workspace;
  const {subtype, toolIndex} = action;
  if (!subtype || typeof toolIndex !== 'number') {
    return workspace;
  }
  const tool = tools[toolIndex];
  if (!tool) {
    return workspace;
  }
  const reducer = tool.reducers[subtype];
  if (!reducer || typeof reducer !== 'function') {
    return workspace;
  }
  const newTools = tools.slice();
  const newState = reducer(tool.state, action);
  const newTool = {...tool, state: newState};
  newTools[toolIndex] = newTool;
  return {...workspace, tools: newTools};
};
