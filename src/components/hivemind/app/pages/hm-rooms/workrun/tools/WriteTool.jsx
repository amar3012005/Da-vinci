import React from 'react';
import GenericTool from './GenericTool';

export default function WriteTool(props) {
  return <GenericTool {...props} label={props.label || 'Wrote a file'} />;
}
