import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProviderModelCatalog, { freeCatalog } from '../ProviderModelCatalog';
test('catalog accepts only explicitly free variants with zero input and output price',()=>{
 const free={id:'provider/model:free',name:'Free model',pricing:{prompt:'0',completion:'0'}};
 expect(freeCatalog({data:[free,{...free,id:'provider/paid'},{...free,id:'provider/not-free:free',pricing:{prompt:'0',completion:'0.01'}},{...free,id:'provider/missing-price:free',pricing:{}}]})).toEqual([free]);
});
test('public catalog loads only on demand without credentials; no model is silently selected',async()=>{
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({data:[{id:'provider/model:free',name:'Free model',pricing:{prompt:'0',completion:'0'}}]})}));
 const view=render(<ProviderModelCatalog provider="OpenRouter"/>);
 expect(global.fetch).not.toHaveBeenCalled();
 const details=view.container.querySelector('details');details.open=true;fireEvent(details,new Event('toggle'));
 expect(await screen.findByText('Free model')).toBeTruthy();
 expect(global.fetch.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
 expect(global.fetch.mock.calls[0][1].credentials).toBe('omit');
 expect(screen.queryByRole('combobox')).toBeNull();
});
