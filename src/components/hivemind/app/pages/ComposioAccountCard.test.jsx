import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComposioAccountCard from './ComposioAccountCard';
afterEach(()=>jest.restoreAllMocks());
test('own account enrollment requires explicit consent and does not claim agent wiring',async()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({connected:false})});render(<ComposioAccountCard/>);await waitFor(()=>expect(global.fetch).toHaveBeenCalled());const button=screen.getByRole('button',{name:'Connect to Composio'});expect(button.disabled).toBe(true);fireEvent.click(screen.getByRole('checkbox'));await waitFor(()=>expect(button.disabled).toBe(false));});
test('verified account reports staged agent access accurately',async()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({connected:true,expired:false})});render(<ComposioAccountCard/>);expect(await screen.findByText(/Agent access is not enabled/)).toBeTruthy();expect(screen.getByRole('button',{name:'Disconnect Composio'})).toBeTruthy();});
