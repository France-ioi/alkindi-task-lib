
import {use, defineValue, defineAction, defineView, addReducer, addSaga} from 'epic-linker';
import {put, call, select} from 'redux-saga/effects';
import React from 'react';
import EpicComponent from 'epic-component';
import {Tabs, TabList, Tab, TabPanel} from 'react-tabs';

import Peer from './peer';

const views = [
  {key: 'task', title: "Énoncé", component: 'Task'},
  {key: 'solve', title: "Résoudre", component: 'WorkspaceTab'},
  {key: 'history', title: "Historique", component: 'History', disabled: true}
];

export default function* (deps) {

  /* The 'Task' view is provided by the task. */
  yield use('Task', 'WorkspaceTab');

  yield defineValue('peer', Peer());

  /* The initial state is established by the 'init' action. */
  yield defineAction('init', 'Init');
  yield addReducer('init', function (state, action) {
    const {view} = action;
    return {view: view || 'task'};
  });

  /* viewSelected {view} is sent when the active tab changes */
  yield defineAction('viewSelected', 'View.Selected');
  yield addReducer('viewSelected', function (state, action) {
    return {...state, view: action.view, feedback: undefined};
  });

  function AppSelector (state) {
    const {view, task} = state;
    return {view, isTaskLoaded: !!task};
  }

  yield defineView('App', AppSelector, EpicComponent(self => {
    function selectTab (index) {
      const key = views[index].key;
      self.props.dispatch({type: deps.viewSelected, view: key});
    }
    self.render = function () {
      const {isTaskLoaded, view} = self.props;
      if (!isTaskLoaded) {
        return <div style={{padding: '20px', fontSize: '32px'}}><i className="fa fa-spinner fa-spin"/></div>;
      }
      const viewIndex = views.findIndex(t => t.key === view);
      return (
        <Tabs onSelect={selectTab} selectedIndex={viewIndex}>
          <TabList>
            {views.map(t => <Tab key={t.key} disabled={t.disabled}>{t.title}</Tab>)}
          </TabList>
          {views.map(t =>
            <TabPanel key={t.key}>
              <div>
                {t.key === view && React.createElement(deps[t.component])}
              </div>
            </TabPanel>)}
        </Tabs>
      );
    };
  }));

  /* Interface with the outside world. */
  yield addSaga(function* () {
    yield call(deps.peer.handleIncomingActions);
  });

};
