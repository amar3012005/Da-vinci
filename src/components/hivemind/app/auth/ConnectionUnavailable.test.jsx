import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import ConnectionUnavailable from './ConnectionUnavailable';
import {classifyConnectionFailure,connectionFailureCopy} from './connection-failure';
let mockAuth={};
jest.mock('./AuthProvider',()=>({useAuth:()=>mockAuth}));
jest.mock('react-router-dom',()=>({useLocation:()=>({pathname:'/hivemind/app/overview/session/saved'}),Navigate:()=> <div data-login-redirect/>}),{virtual:true});
import ProtectedRoute from './ProtectedRoute';

test('DNS/network failure is not asserted to be offline, and HTTP failures remain distinct',()=>{
 expect(classifyConnectionFailure({code:'ERR_NETWORK'})).toEqual({kind:'network'});
 expect(connectionFailureCopy({kind:'network'},true).title).toBe('Can’t reach SINGULANCE');
 expect(connectionFailureCopy({kind:'network'},false).title).toBe('No internet connection');
 expect(classifyConnectionFailure({message:'bootstrap_timeout'})).toEqual({kind:'timeout'});
 expect(classifyConnectionFailure({response:{status:503}})).toEqual({kind:'service',status:503});
});

test('offline notice updates when connectivity returns and retry calls the supplied action',async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const original=Object.getOwnPropertyDescriptor(navigator,'onLine');
 Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const retry=jest.fn();
 try {
  await act(async()=>root.render(<ConnectionUnavailable failure={{kind:'network'}} onRetry={retry}/>));
  expect(host.textContent).toContain('No internet connection');
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  await act(async()=>window.dispatchEvent(new Event('online')));
  expect(host.textContent).toContain('Can’t reach SINGULANCE');
  await act(async()=>host.querySelector('button').click());
  expect(retry).toHaveBeenCalledTimes(1);
 } finally {await act(async()=>root.unmount());host.remove();if(original)Object.defineProperty(navigator,'onLine',original);else delete navigator.onLine;}
});

test('unreachable workspace retains a recovery screen; confirmed sign-out still redirects',async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try {
  mockAuth={isAuthenticated:false,loading:false,isUnreachable:true,connectionFailure:{kind:'timeout'},refresh:jest.fn()};
  await act(async()=>root.render(<ProtectedRoute><div>private conversation</div></ProtectedRoute>));
  expect(host.textContent).toContain('Connection timed out');
  expect(host.textContent).not.toContain('private conversation');
  expect(host.querySelector('[data-login-redirect]')).toBeNull();
  mockAuth={isAuthenticated:false,loading:false,isUnreachable:false};
  await act(async()=>root.render(<ProtectedRoute><div>private conversation</div></ProtectedRoute>));
  expect(host.querySelector('[data-login-redirect]')).not.toBeNull();
 } finally {await act(async()=>root.unmount());host.remove();}
});
