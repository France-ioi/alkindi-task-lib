
import React from 'react';
import EpicComponent from 'epic-component';
import {use, defineAction, defineSelector, defineView, addReducer} from 'epic-linker';

export default function* (deps) {

  // Use views defined in the task bundle:
  yield use('Task', 'Workspace');

  // Standard selector for the 'Task' view.
  yield defineSelector('TaskSelector', function (state) {
     const {task} = state;
     return {task};
  });

  // Standard selector for the 'AnswerDialog' view.
  yield defineSelector('AnswerDialogSelector', function (state, props) {
    const {feedback} = state;
    console.log('props', props);
    const submit = function (answer) {
      props.dispatch({type: deps.answerSubmitted, answer});
    }
    const onSuccess = function () {
      props.dispatch({type: deps.taskCompleted});
    };
    return {submit, feedback, onSuccess};
  });

  yield defineAction('init', 'Init');
  yield addReducer('init', function (state, _action) {
    return {
      view: 'task'
    };
  });

  yield defineAction('viewSelected', 'View.Selected');
  yield addReducer('viewSelected', function (state, action) {
    return {...state, view: action.view};
  });

  yield defineAction('taskLoaded', 'Task.Loaded');
  yield addReducer('taskLoaded', function (state, action) {
    return {...state, task: action.task};
  });

  yield defineSelector('AppSelector', function (state) {
    const {view, task} = state;
    return {view, task};
  });

  yield defineView('App', 'AppSelector', EpicComponent(self => {
    self.render = function () {
      const {task, view, workspace} = self.props;
      if (!task) {
       return <p>Task is not loaded.</p>;
      }
      switch (view) {
        case 'task':
          return <deps.Task/>;
        case 'workspace':
          return <deps.Workspace/>;
        case 'answer':
          return <deps.AnswerDialog/>;
        default:
          return <p>Undefined view {view}</p>;
      }
    };
  }));

};