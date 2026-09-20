import React from 'react';
import GenericTool from './GenericTool';

export default function EditTool(props) {
  return <GenericTool {...props} label={props.label || 'Edited a file'} />;
}
