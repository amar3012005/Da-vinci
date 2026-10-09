import React from 'react';
import MobileShell from '../MobileShell';
import KnowledgeBase from '../../pages/KnowledgeBase';
import '../mobile-tools.css';
/** Dedicated phone destination reuses the existing upload queue, permissions and receipts. */
export default function MobileUploads() {
 return <MobileShell><div data-mobile-tools data-mobile-uploads className="p-4 pb-8 min-w-0"><KnowledgeBase /></div></MobileShell>;
}
