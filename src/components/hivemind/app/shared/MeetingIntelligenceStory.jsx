import React from 'react';
import './meeting-intelligence.css';

export const meetingIntelligenceCopy = {
  headline: 'Connect your team’s thinking to the company Brain.',
  description: 'Capture what people discuss, decide and commit to. HIVEMIND connects the conversation with relevant company documents, previous decisions and workspace activity—surfacing conflicting plans, missing context, unresolved commitments and useful next steps. Each meeting becomes knowledge your company can use in future decisions and work.',
};

export function MeetingKnowledgeDiagram() {
  return <div className="meeting-knowledge-diagram" role="img" aria-label="Meeting conversations connect with company knowledge to surface decisions, commitments and next steps.">
    <svg viewBox="0 0 400 174" fill="none" aria-hidden="true">
      <path d="M95 85h58m94 0h58" stroke="#9fb9d7" strokeWidth="1.5" strokeDasharray="3 5"/>
      <rect x="20" y="51" width="76" height="67" rx="12" fill="#fff" fillOpacity=".8" stroke="#ccd9e7"/>
      <path d="M35 85h5l4-12 6 25 6-34 6 40 6-25 5 6h8" stroke="#5184bd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="154" y="38" width="92" height="92" rx="18" fill="#e0ebf8" fillOpacity=".8" stroke="#b7cde7"/>
      <path d="M200 61c-11-13-28-2-22 11-13 5-11 24 2 27-3 14 15 21 20 9m0-47c11-13 28-2 22 11 13 5 11 24-2 27 3 14-15 21-20 9V61Zm-18 17c11-4 13 6 13 6m-15 15c5-8 13-4 13-4m23-17c-9-3-11 7-11 7m15 14c-5-8-13-4-13-4" stroke="#446d9b" strokeWidth="2" strokeLinecap="round"/>
      <rect x="305" y="51" width="76" height="67" rx="12" fill="#fff" fillOpacity=".8" stroke="#ccd9e7"/>
      <path d="m320 72 3 3 5-6m6 3h30m-44 13 3 3 5-6m6 3h25m-39 13 3 3 5-6m6 3h19" stroke="#5184bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div className="meeting-diagram-labels"><span>Conversations</span><span>Company Brain</span><span>Shared understanding</span></div>
  </div>;
}

export default function MeetingIntelligenceStory({ popup = false }) {
  return <div className={popup ? 'meeting-intelligence-story is-popup' : 'meeting-intelligence-story'}>
    <div className="meeting-story-copy">
      {popup && <p className="meeting-story-name">Meeting Intelligence</p>}
      <h2>{meetingIntelligenceCopy.headline}</h2>
      <p>{meetingIntelligenceCopy.description}</p>
    </div>
    <MeetingKnowledgeDiagram/>
    {popup && <p className="meeting-story-essence">What your people know becomes knowledge your company can act on.</p>}
  </div>;
}
