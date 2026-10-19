import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatModelConnection from '../ChatModelConnection';
jest.mock('../../auth/AuthProvider',()=>({useAuth:()=>({org:{id:'org',name:'Sakana'},user:{id:'user'}})}));
test('connects and selects a default inside the chat dialog',async()=>{
 const {TextEncoder,TextDecoder}=require('util');global.TextDecoder=TextDecoder;
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 let connected=false,selected='gpt-6-luna';
 global.fetch=jest.fn(async(url,options)=>{
  if(url.endsWith('/start')){
   connected=true;
   let sent=false;
   return {ok:true,body:{getReader:()=>({read:async()=>sent?{done:true}:(sent=true,{done:false,value:new TextEncoder().encode('data: {"type":"settled","status":"authorized"}\n\n')}),cancel:async()=>{},releaseLock:()=>{}})}};
  }
  if(url.endsWith('/select'))selected=JSON.parse(options.body).model;
  return {ok:true,json:async()=>({available:true,connected,selected_model:selected,models:['gpt-6-luna','gpt-6-astra']})};
 });
 render(<ChatModelConnection/>);
 expect(global.fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Connect to your ChatGPT'}));
 await screen.findByRole('button',{name:'Connect now'});
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Connect now'}));
 const model=await screen.findByRole('combobox',{name:'Default ChatGPT model'});
 expect(model.value).toBe('gpt-6-luna');
 fireEvent.change(model,{target:{value:'gpt-6-astra'}});
 await waitFor(()=>expect(global.fetch.mock.calls.some(([url,options])=>url.endsWith('/select')&&JSON.parse(options.body).model==='gpt-6-astra')).toBe(true));
 expect(screen.getByRole('dialog')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Back to chat'}));
 expect(screen.queryByRole('dialog')).toBeNull();
});
