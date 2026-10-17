import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ModelConnectionCard from '../ModelConnectionCard';
let mockAuth={org:{id:'company-a',name:'Sakana'},user:{id:'user-a'}};
jest.mock('../../auth/AuthProvider',()=>({useAuth:()=>mockAuth}));
afterEach(()=>{jest.restoreAllMocks();});
test('requires explicit consent before starting cloud sign-in',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({available:true,connected:false})}));
 render(<ModelConnectionCard/>);
 await screen.findByRole('button',{name:'Connect ChatGPT'});
 expect(screen.getByRole('button',{name:'Connect ChatGPT'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.getByRole('button',{name:'Connect ChatGPT'}).disabled).toBe(false);
 expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('shows server models and usage, sends no caller identity, and clears state on account switch',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({available:true,connected:true,models:['saved-model'],selected_model:'saved-model',usage:{inputTokens:12,outputTokens:3}})}));
 const view=render(<ModelConnectionCard/>);
 await screen.findByRole('option',{name:'saved-model'});
 expect(screen.getByText('Input tokens: 12')).toBeTruthy();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:''}});
 await waitFor(()=>expect(global.fetch.mock.calls.some(([url,options])=>url.endsWith('/select')&&options.body==='{"model":null}')).toBe(true));
 mockAuth={org:{id:'company-b',name:'Other'},user:{id:'user-b'}};
 global.fetch.mockImplementation(()=>new Promise(()=>{}));
 view.rerender(<ModelConnectionCard/>);
 expect(screen.queryByRole('option',{name:'saved-model'})).toBeNull();
});
test('renders native method options and sends the selected option ID',async()=>{
 const {TextDecoder,TextEncoder}=require('util');global.TextDecoder=TextDecoder;
 let deliver;
 const reader={read:jest.fn().mockResolvedValueOnce({done:false,value:new TextEncoder().encode('data: '+JSON.stringify({type:'attempt',attempt_id:'attempt-a'})+'\n\ndata: '+JSON.stringify({type:'prompt',prompt_id:'prompt-a',prompt:{kind:'select',message:'Select OpenAI Codex login method:',options:[{id:'native-device-id',label:'Device code login (headless)'}]}})+'\n\n')}).mockImplementation(()=>new Promise(resolve=>{deliver=resolve;})),cancel:jest.fn(async()=>{}),releaseLock:jest.fn()};
 global.fetch=jest.fn(async(url)=>url.endsWith('/start')?{ok:true,body:{getReader:()=>reader}}:{ok:true,json:async()=>({available:true,connected:false})});
 render(<ModelConnectionCard/>);await screen.findByRole('button',{name:'Connect ChatGPT'});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Connect ChatGPT'}));
 const method=await screen.findByRole('combobox');expect(screen.queryByRole('textbox')).toBeNull();
 fireEvent.change(method,{target:{value:'native-device-id'}});fireEvent.click(screen.getByRole('button',{name:'Continue'}));
 await waitFor(()=>expect(global.fetch.mock.calls.some(([url,options])=>url.endsWith('/answer')&&JSON.parse(options.body).answer==='native-device-id')).toBe(true));
 await act(async()=>{deliver({done:true});});
});
