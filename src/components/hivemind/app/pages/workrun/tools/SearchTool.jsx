import React from 'react';
import GenericTool from './GenericTool';

export default function SearchTool(props) {
  return <GenericTool {...props} label={props.label || 'Searched the web'} />;
}
