import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/components/hivemind/app/auth/AuthProvider';
function Demo() {
 const auth = useAuth();
 return <main><p data-auth-state>{auth.authState}</p><p data-auth-user>{auth.user?.id || ''}</p><button onClick={()=>auth.login()}>Sign in</button><button onClick={()=>auth.logout()}>Sign out</button></main>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><Demo /></AuthProvider></BrowserRouter>);
