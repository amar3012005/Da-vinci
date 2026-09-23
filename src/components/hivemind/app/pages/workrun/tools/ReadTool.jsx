import React from 'react';
import GenericTool from './GenericTool';

export default function ReadTool(props) {
  return <GenericTool {...props} label={props.label || 'Read a file'} />;
}
