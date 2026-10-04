import React from 'react';
export const PublicInitialContent = React.createContext('');
export default function PublicPageLoading() {
 const html=React.useContext(PublicInitialContent);
 return html ? <div dangerouslySetInnerHTML={{__html:html}}/> : <div className="min-h-screen bg-[#FBFBF8]"/>;
}
