import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
let mockLocation = { pathname:'/hivemind/app/overview/session/brain-saved', search:'', hash:'' };
const mockNavigate = jest.fn();
jest.mock('react-router-dom',()=>({ useLocation:()=>mockLocation, useNavigate:()=>mockNavigate }));
jest.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'user-a'},org:{id:'org-a'}})}));
import PersistentHarnessPanes from './PersistentHarnessPanes';
it('retains both exact client documents and URLs when switching modes, and rejects foreign messages',async()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try {
    await act(async()=>root.render(<PersistentHarnessPanes />));
    const brain=host.querySelector('iframe');const source=brain.getAttribute('src');
    await act(async()=>{window.dispatchEvent(new MessageEvent('message',{origin:'https://next.singulancelabs.com',source:brain.contentWindow,data:{type:'hivemind.native-pane',version:1,scope:'foreign:org-a',kind:'route',path:'/hivemind/app/overview/session/foreign'}}));});
    expect(mockNavigate).not.toHaveBeenCalled();
    mockLocation={pathname:'/hivemind/app/employee/harness/session/runtime-saved',search:'',hash:''};
    await act(async()=>root.render(<PersistentHarnessPanes />));
    const runtime=host.querySelector('[data-native-pane="runtime"] iframe');
    expect(host.querySelectorAll('iframe')).toHaveLength(2);expect(host.querySelector('[data-native-pane="brain"]').hidden).toBe(true);
    mockLocation={pathname:'/hivemind/app/overview/session/brain-saved',search:'',hash:''};
    await act(async()=>root.render(<PersistentHarnessPanes />));
    expect(host.querySelector('[data-native-pane="brain"] iframe')).toBe(brain);
    expect(brain.getAttribute('src')).toBe(source);
    expect(host.querySelector('[data-native-pane="runtime"] iframe')).toBe(runtime);
    expect(host.querySelector('[data-native-pane="runtime"]').hidden).toBe(true);
  } finally { await act(async()=>root.unmount());host.remove(); }
});
