
import {put, call, select} from 'redux-saga/effects';
import React from 'react';
import EpicComponent from 'epic-component';
import {Tabs, TabList, Tab, TabPanel} from 'react-tabs';

import Peer from './peer';

const views = [
  {key: 'task', title: "Énoncé", component: 'Task'},
  {key: 'solve', title: "Résoudre", component: 'WorkspaceTab'},
  {key: 'history', title: "Historique"}
];
views.forEach(function (view, index) {
  view.index = index;
});

export default function (bundle, deps) {

  /* The 'Task' view is provided by the task. */
  bundle.use('Task', 'WorkspaceTab');

  bundle.defineValue('peer', Peer());

  /* The initial state is established by the 'init' action. */
  bundle.defineAction('init', 'Init');
  bundle.addReducer('init', function (state, action) {
    const {view, taskBaseUrl} = action;
    return {view: views[0].key, taskBaseUrl};
  });

  bundle.addReducer('statePulled', function (state, action) {
    const {view} = action;
    return {...state, view};
  });

  /* viewSelected {view} is sent when the active tab changes */
  bundle.defineAction('viewSelected', 'View.Selected');
  bundle.addReducer('viewSelected', function (state, action) {
    return {...state, view: action.view, feedback: undefined};
  });

  function AppSelector (state) {
    const {view, task} = state;
    const isHosted = (window !== window.parent);
    const taskView = views.find(t => t.key == view);
    return {view: taskView, isHosted, isTaskLoaded: !!task};
  }

  bundle.defineView('App', AppSelector, EpicComponent(self => {
    function selectTab (index) {
      self.props.dispatch({type: deps.viewSelected, view: views[index].key});
    }
    self.render = function () {
      const {isTaskLoaded, isHosted, view} = self.props;
      if (!isTaskLoaded) {
        return <div style={{padding: '20px', fontSize: '32px'}}><i className="fa fa-spinner fa-spin"/></div>;
      }
      if (isHosted) {
        /* Case where the task is loaded inside a platform. */
        if (!view.component) {
          /* No component indicates the platform is responsible for the view. */
          return false;
        }
        return <div>{React.createElement(deps[view.component])}</div>;
      }
      /* This view is used when the task is loaded without a platform. */
      return (
        <Tabs onSelect={selectTab} selectedIndex={view.index}>
          <TabList>
            {views.map(t => <Tab key={t.key} disabled={t.disabled}>{t.title}</Tab>)}
          </TabList>
          {views.map(t =>
            <TabPanel key={t.key}>
              <div>
                {t === view && React.createElement(deps[t.component])}
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
