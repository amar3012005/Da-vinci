/**
 * MainHomepageMobile.jsx
 * 
 * This file now serves as a simple wrapper that imports and renders
 * the new modular MobileHomepage component.
 * 
 * The redesigned mobile experience is built with modular components
 * located in /src/components/mobile/
 */

import React from 'react';
import MobileHomepage from './mobile/MobileHomepage';

const MainHomepage = () => {
  return <MobileHomepage />;
};

export default MainHomepage;