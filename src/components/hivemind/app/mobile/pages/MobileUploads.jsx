import React from 'react';
import { Upload } from 'lucide-react';
import MobileShell from '../MobileShell';
import { glassHeader } from '../MobileGlassHeader';
import KnowledgeBase from '../../pages/KnowledgeBase';
import '../mobile-tools.css';
/** Dedicated phone destination reuses the existing upload queue, permissions and receipts. */
export default function MobileUploads() {
  return <MobileShell renderHeader={glassHeader({ icon: <Upload size={16} strokeWidth={2} />, title: 'Uploads' })}>
    <div data-mobile-tools data-mobile-glass data-mobile-uploads className="min-w-0"><KnowledgeBase /></div>
  </MobileShell>;
}
