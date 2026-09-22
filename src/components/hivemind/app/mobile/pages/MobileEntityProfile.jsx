import React from 'react';
import { useParams } from 'react-router-dom';
import EntityProfileDrawer from '../../shared/EntityProfileDrawer';

export default function MobileEntityProfile() {
  const { entityId } = useParams();
  return <EntityProfileDrawer entityId={entityId} mobile />;
}
