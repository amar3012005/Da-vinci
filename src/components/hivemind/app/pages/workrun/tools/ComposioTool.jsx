import React from 'react';
import GenericTool from './GenericTool';

export default function ComposioTool(props) {
  return <GenericTool {...props} label={props.label || 'Used a connected app'} />;
}
