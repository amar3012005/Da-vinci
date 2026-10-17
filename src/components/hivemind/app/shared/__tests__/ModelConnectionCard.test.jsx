import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
