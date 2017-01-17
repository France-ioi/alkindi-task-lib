import React from 'react';
import Tooltip from 'rc-tooltip';
import EpicComponent from 'epic-component';

export default EpicComponent(self => {

  /* props: content, placement */

  self.render = function () {
    const {placement, content} = self.props;
    const overlay = (
      <div style={{maxWidth: '200px', fontSize: '120%'}}>
        {content}
      </div>
    );
    return (
      <Tooltip animation="zoom" trigger="hover click" overlay={overlay} placement={placement}>
        {self.props.children || <i className='fa fa-question-circle'/>}
      </Tooltip>
    );
  };

});
