import React, { act } from 'react';
import { mount } from '../entry';
let mockAuth, routerProps;
jest.mock('react-router-dom',()=>({Router:props=>{routerProps=props;return props.children;}}),{virtual:true});
jest.mock('../../auth/AuthProvider',()=>({AuthProvider:({children})=>children,useAuth:()=>mockAuth}));
jest.mock('../../layout/Sidebar',()=>({__esModule:true,default:props=><aside data-scope={props.activeSection} data-context={props.contextPath} data-drawer={String(Boolean(props.mobileDrawer))}>Shared sidebar<button onClick={()=>props.onCollapsedChange(true)}>Collapse</button><button data-open onClick={()=>props.onCollapsedChange(false)}>Open</button></aside>}));
jest.mock('../../../../../i18n',()=>({}));
beforeEach(()=>{
 Object.defineProperty(window,'location',{configurable:true,value:{hostname:'dots.singulancelabs.com',pathname:'/apps',search:'?return_to=%2Fhivemind%2Fapp%2Femployee%2Fdots%2Femployee%2Ffixture',hash:'',assign:jest.fn(),replace:jest.fn(),reload:jest.fn()}});
 mockAuth={loading:false,isAuthenticated:true,user:{id:'u'},org:{id:'o'}};
 global.IS_REACT_ACT_ENVIRONMENT=true;
});
test('mounts one isolated shared sidebar, preserves context and unmounts cleanly',()=>{
 const host=document.createElement('div');document.body.append(host);let cleanup;
 act(()=>{cleanup=mount(host,{identity:{userId:'u',organizationId:'o'},stylesheet:'/shared-hyperagent-shell/pinned.css'});});
 expect(host.shadowRoot.querySelectorAll('aside')).toHaveLength(1);
 expect(host.shadowRoot.querySelector('iframe')).toBeNull();
 expect(host.shadowRoot.querySelector('aside').dataset.context).toContain('/employee/fixture');
 expect(host.shadowRoot.querySelector('link').getAttribute('href')).toBe('/shared-hyperagent-shell/pinned.css');
 act(()=>host.shadowRoot.querySelector('button').click());expect(host.style.width).toBe('68px');
 act(()=>cleanup());expect(host.shadowRoot.querySelector('aside')).toBeNull();expect(host.shadowRoot.querySelector('slot')).not.toBeNull();host.remove();
});
test('does not render roster on account mismatch and exposes retry',()=>{
 const host=document.createElement('div');document.body.append(host);let cleanup;
 act(()=>{cleanup=mount(host,{identity:{userId:'other',organizationId:'o'},stylesheet:'/pinned.css'});});
 expect(host.shadowRoot.querySelector('aside')).toBeNull();expect(host.shadowRoot.querySelector('[role=alert]')).not.toBeNull();
 act(()=>host.shadowRoot.querySelector('button').click());expect(window.location.reload).toHaveBeenCalledTimes(1);
 act(()=>cleanup());host.remove();
});

describe('Company Brain mode',()=>{
 const ROOM='/dots/dot_company_brain';
 const identity={userId:'u',organizationId:'o'};
 const setPage=(pathname=ROOM,hostname='brain-runner.singulancelabs.com')=>Object.defineProperty(window,'location',{configurable:true,value:{hostname,pathname,search:'',hash:'',href:`https://${hostname}${pathname}`,assign:jest.fn(),replace:jest.fn(),reload:jest.fn()}});
 const phone=matches=>{window.matchMedia=jest.fn(()=>({matches,addEventListener:jest.fn(),removeEventListener:jest.fn()}));};
 let host,cleanup;
 beforeEach(()=>{window.localStorage.clear();setPage();phone(false);host=document.createElement('div');document.body.append(host);});
 afterEach(()=>{act(()=>cleanup?.());host.remove();});
 const mountBrain=()=>{act(()=>{cleanup=mount(host,{identity,stylesheet:'/s.css',mode:'brain'});});};

 test('shows the Brain sidebar with Chat active on the Company Brain page, beside the room',()=>{
  mountBrain();
  const aside=host.shadowRoot.querySelector('aside');
  expect(aside.dataset.scope).toBe('hivemind');
  expect(aside.dataset.drawer).toBe('false');
  expect(routerProps.location.pathname).toBe('/hivemind/app/overview/new');
  expect(host.style.width).toBe('300px');
 });
 test('sidebar links open the matching Brain host pages; Runtime pages open on Runtime',()=>{
  mountBrain();
  const href=routerProps.navigator.createHref;
  expect(href('/hivemind/app/memories')).toBe('https://next.singulancelabs.com/hivemind/app/memories');
  expect(href('/hivemind/app/overview/dreaming')).toBe('https://next.singulancelabs.com/hivemind/app/overview/dreaming');
  expect(href({pathname:'/hivemind/app/workspace',search:'?tab=members'})).toBe('https://next.singulancelabs.com/hivemind/app/workspace?tab=members');
  expect(href('/hivemind/app/employee/harness')).toBe('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
  expect(href('https://evil.test/hivemind/app')).toBe('#');
  routerProps.navigator.push('/hivemind/app/graph');
  expect(window.location.assign).toHaveBeenCalledWith('https://next.singulancelabs.com/hivemind/app/graph');
 });
 test('Chat reopens the cached conversation of this company and user, and does nothing while the room is showing',()=>{
  window.localStorage.setItem('hm:o:u:brain-room:dot_company_brain','conv_abc123');
  window.localStorage.setItem('hm:o:other:brain-room:dot_company_brain','conv_other');
  mountBrain();
  expect(routerProps.navigator.createHref('/hivemind/app/overview/new')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_abc123');
  routerProps.navigator.push('/hivemind/app/overview/new');
  expect(window.location.assign).toHaveBeenCalledWith('https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_abc123');
  window.location.assign.mockClear();
  window.location.href='https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_abc123';
  routerProps.navigator.push('/hivemind/app/overview/new');
  expect(window.location.assign).not.toHaveBeenCalled();
 });
 test('a router replace to the page already showing (clicking the active Chat link) does not reload the page',()=>{
  window.localStorage.setItem('hm:o:u:brain-room:dot_company_brain','conv_abc123');
  mountBrain();
  window.location.href='https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_abc123';
  routerProps.navigator.replace('/hivemind/app/overview/new');
  expect(window.location.replace).not.toHaveBeenCalled();
  routerProps.navigator.replace('/hivemind/app/graph');
  expect(window.location.replace).toHaveBeenCalledWith('https://next.singulancelabs.com/hivemind/app/graph');
 });
 test('account settings open the Brain host profile',()=>{
  mountBrain();
  window.dispatchEvent(new Event('hm:open-account-settings'));
  expect(window.location.assign).toHaveBeenCalledWith('https://next.singulancelabs.com/hivemind/app/profile');
 });
 test('on a phone the sidebar is a drawer that stays hidden until opened, and tells the room when it changes',()=>{
  phone(true);
  const states=[];const note=event=>states.push(event.detail.open);window.addEventListener('hivemind:brain-drawer',note);
  mountBrain();
  expect(host.shadowRoot.querySelector('aside').dataset.drawer).toBe('true');
  expect(host.style.display).toBe('none');
  act(()=>host.shadowRoot.querySelector('[data-open]').click());
  expect(host.style.display).toBe('block');expect(host.style.position).toBe('fixed');
  act(()=>host.shadowRoot.querySelector('button[aria-label]').click());
  expect(host.style.display).toBe('none');
  expect(states).toEqual([false,true,false]);
  window.removeEventListener('hivemind:brain-drawer',note);
 });
 test('mounts only on the Company Brain page of the brain host',()=>{
  for(const [path,name] of [['/apps','brain-runner.singulancelabs.com'],['/dots/dot_other','brain-runner.singulancelabs.com'],[ROOM,'runtime-runner.singulancelabs.com']]){
   setPage(path,name);
   expect(()=>mount(host,{identity,stylesheet:'/s.css',mode:'brain'})).toThrow('Unsupported shell host');
  }
  setPage(ROOM+'/');act(()=>{cleanup=mount(host,{identity,stylesheet:'/s.css',mode:'brain'});});
 });
});
