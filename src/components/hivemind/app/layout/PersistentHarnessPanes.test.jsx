import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
let mockLocation = { pathname:'/hivemind/app/overview/session/brain-saved', search:'', hash:'' };
const mockNavigate = jest.fn();
jest.mock('react-router-dom',()=>({ useLocation:()=>mockLocation, useNavigate:()=>mockNavigate }), { virtual: true });
jest.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'user-a'},org:{id:'org-a'}})}));
import PersistentHarnessPanes, { nativePreviewExpanded } from './PersistentHarnessPanes';
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

it('preserves identity received before window.load and retries a missed handshake without reloading', async()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  jest.useFakeTimers();
  mockLocation={pathname:'/hivemind/app/overview/session/brain-saved',search:'',hash:''};
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try {
    await act(async()=>root.render(<PersistentHarnessPanes />));
    const brain=host.querySelector('iframe'); const source=brain.getAttribute('src');
    const post=jest.spyOn(brain.contentWindow,'postMessage');
    await act(async()=>jest.advanceTimersByTime(2000));
    expect(post).toHaveBeenCalledWith(expect.objectContaining({kind:'hello',scope:'user-a:org-a'}),'https://next.singulancelabs.com');
    await act(async()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://next.singulancelabs.com',source:brain.contentWindow,data:{type:'hivemind.native-pane',version:1,scope:'user-a:org-a',kind:'identity'}})));
    expect(brain.style.visibility).toBe('visible');
    await act(async()=>brain.dispatchEvent(new Event('load')));
    await act(async()=>jest.advanceTimersByTime(31000));
    expect(brain.style.visibility).toBe('visible');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('iframe')).toBe(brain);
    expect(brain.getAttribute('src')).toBe(source);
  } finally { await act(async()=>root.unmount());host.remove();jest.useRealTimers(); }
});

it('ignores the mounted closed panel and follows only its native expanded flag',()=>{
 const doc=document.implementation.createHTMLDocument();
 const panel=doc.createElement('div');panel.setAttribute('data-sidebar-right-panel','push');panel.style.width='671px';doc.body.append(panel);
 expect(nativePreviewExpanded(doc)).toBe(false);
 panel.setAttribute('data-sidebar-right-open','true');expect(nativePreviewExpanded(doc)).toBe(true);
 panel.removeAttribute('data-sidebar-right-open');expect(nativePreviewExpanded(doc)).toBe(false);
});


it('a document finishing after the recovery deadline still completes the scoped handshake', async()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  jest.useFakeTimers();
  mockLocation={pathname:'/hivemind/app/overview/session/brain-saved',search:'',hash:''};
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try {
    await act(async()=>root.render(<PersistentHarnessPanes />));
    const brain=host.querySelector('iframe'); const source=brain.getAttribute('src');
    const post=jest.spyOn(brain.contentWindow,'postMessage');
    await act(async()=>jest.advanceTimersByTime(31000));
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    post.mockClear();
    await act(async()=>jest.advanceTimersByTime(10000));
    expect(post).toHaveBeenCalledWith(expect.objectContaining({kind:'hello',scope:'user-a:org-a'}),'https://next.singulancelabs.com');
    expect(post.mock.calls.length).toBeLessThanOrEqual(2);
    await act(async()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://next.singulancelabs.com',source:brain.contentWindow,data:{type:'hivemind.native-pane',version:1,scope:'foreign:org-a',kind:'identity'}})));
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    await act(async()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://next.singulancelabs.com',source:brain.contentWindow,data:{type:'hivemind.native-pane',version:1,scope:'user-a:org-a',kind:'identity'}})));
    expect(brain.style.visibility).toBe('visible');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(brain.getAttribute('src')).toBe(source);
  } finally { await act(async()=>root.unmount());host.remove();jest.useRealTimers(); }
});

it('forwards Runtime appearance invalidation only from the exact scoped Runtime pane', async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 mockLocation={pathname:'/hivemind/app/employee/harness/session/runtime-saved',search:'',hash:''};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const refresh=jest.fn();
 window.addEventListener('hivemind:runtime-appearance-saved',refresh);
 try {
  await act(async()=>root.render(<PersistentHarnessPanes/>));
  const runtime=host.querySelector('[data-native-pane="runtime"] iframe');
  const emit=async(origin,scope)=>act(async()=>window.dispatchEvent(new MessageEvent('message',{origin,source:runtime.contentWindow,data:{type:'hivemind.native-pane',version:1,scope,kind:'event',name:'hivemind:runtime-appearance-saved'}})));
  await emit('https://runtime-runner.singulancelabs.com','foreign:org-a');
  await emit('https://next.singulancelabs.com','user-a:org-a');
  expect(refresh).not.toHaveBeenCalled();
  await emit('https://runtime-runner.singulancelabs.com','user-a:org-a');
  expect(refresh).toHaveBeenCalledTimes(1);
 } finally {window.removeEventListener('hivemind:runtime-appearance-saved',refresh);await act(async()=>root.unmount());host.remove();}
});
