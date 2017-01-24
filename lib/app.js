
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

export default function (bundle, deps) {

  /* The 'Task' view is provided by the task. */
  bundle.use('Task', 'WorkspaceTab');

  bundle.defineValue('peer', Peer());

  /* The initial state is established by the 'init' action. */
  bundle.defineAction('init', 'Init');
  bundle.addReducer('init', function (state, action) {
    const {view, taskBaseUrl} = action;
    return {view: view || 'task', taskBaseUrl};
  });

  /* viewSelected {view} is sent when the active tab changes */
  bundle.defineAction('viewSelected', 'View.Selected');
  bundle.addReducer('viewSelected', function (state, action) {
    return {...state, view: action.view, feedback: undefined};
  });

  function AppSelector (state) {
    const {view, task} = state;
    return {view, isTaskLoaded: !!task};
  }

  bundle.defineView('App', AppSelector, EpicComponent(self => {
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
  bundle.addSaga(function* () {
    yield call(deps.peer.handleIncomingActions);
  });

};
