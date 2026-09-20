import React from 'react';
import GenericTool from './GenericTool';

export default function BashTool(props) {
  return <GenericTool {...props} label={props.label || 'Ran a command'} />;
}
