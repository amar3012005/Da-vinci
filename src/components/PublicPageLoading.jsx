import React from 'react';
import RuntimeWorkspaceLoading from './RuntimeWorkspaceLoading';
export const PublicInitialContent = React.createContext('');
export default function PublicPageLoading() {
 const html=React.useContext(PublicInitialContent);
 if (['runtime-runner.singulancelabs.com', 'next.singulancelabs.com'].includes(window.location.hostname) && /^\/hivemind\/app(?:\/|$)/.test(window.location.pathname)) return <RuntimeWorkspaceLoading />;
 return html ? <div dangerouslySetInnerHTML={{__html:html}}/> : <div className="min-h-screen bg-[#FBFBF8]"/>;
}
