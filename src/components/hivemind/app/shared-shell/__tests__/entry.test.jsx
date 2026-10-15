import React, { act } from 'react';
import { mount } from '../entry';
let mockAuth;
jest.mock('react-router-dom',()=>({Router:({children})=>children}));
jest.mock('../../auth/AuthProvider',()=>({AuthProvider:({children})=>children,useAuth:()=>mockAuth}));
jest.mock('../../layout/Sidebar',()=>({__esModule:true,default:props=><aside data-scope={props.activeSection} data-context={props.contextPath}>Shared sidebar<button onClick={()=>props.onCollapsedChange(true)}>Collapse</button></aside>}));
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
