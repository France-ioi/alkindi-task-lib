
import {defineView, addReducer} from 'epic-linker';
import runTask from 'alkindi-task-lib';

export function run (container, options) {
   runTask(container, options, TaskBundle);
};

function* TaskBundle (deps) {

  const workspaceOperations = {
    taskLoaded: state => state,
    taskUpdated: state => state,
    workspaceLoaded: (state, dump) => state,
    dumpWorkspace: state => { return {}; },
    isWorkspaceReady: state => true
  };

  yield addReducer('init', function (state, action) {
    return {...state, workspaceOperations};
  });

  yield defineView('Task', TaskSelector, props => <p>Task</p>);
  function TaskSelector (state) {
    const {task} = state;
    return {task};
  }

  yield defineView('Workspace', WorkspaceSelector, props => <p>Workspace</p>);
  function WorkspaceSelector (state, props) {
    const {task, workspace, hintRequest, submitAnswer} = state;
    return {task, workspace, hintRequest, submitAnswer};
  }

}
