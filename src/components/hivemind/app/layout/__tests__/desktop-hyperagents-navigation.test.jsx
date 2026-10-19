import React from 'react';
jest.mock('react-router-dom', () => {
 global.TextEncoder = require('util').TextEncoder;
 return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesktopHyperAgentsNavigation, { createEmployeeSpan, columnsForWidth } from '../DesktopHyperAgentsNavigation';
const team = Array.from({length:5}, (_,i)=>({id:`agent-${i}`,name:`Employee ${i}`,role:i===0?'Financial Product Strategist':'Specialist'}));
const props = {team,rooms:[],selectedAgent:null,openingAgent:null,columns:3,collapsed:false,user:{display_name:'Amar'},planLabel:'Enterprise',onOpenAgent:jest.fn(),onCreate:jest.fn(),onCompany:jest.fn(),logout:jest.fn()};
const view = overrides => <MemoryRouter><DesktopHyperAgentsNavigation {...props} {...overrides}/></MemoryRouter>;
beforeEach(()=>jest.clearAllMocks());
test('keeps Runtime separate and the create action fills the remaining employee row',()=>{
 const r=render(view());
 const grid=screen.getByRole('region',{name:'Employees',hidden:true});
 expect(within(grid).queryByRole('button',{name:/Runtime/})).toBeNull();
 expect(createEmployeeSpan(5,3)).toBe(1);
 expect(createEmployeeSpan(7,3)).toBe(2);
 expect(createEmployeeSpan(6,3)).toBe(3);
 expect(createEmployeeSpan(0,3)).toBe(3);
 expect(createEmployeeSpan(5,2)).toBe(1);
 expect(createEmployeeSpan(5,1)).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'Create employee'}));
 expect(props.onCreate).toHaveBeenCalledTimes(1);
 r.unmount();
});
test('preserves profession and the exact agent object when opening a workspace',()=>{
 render(view());
 expect(screen.getAllByRole('tooltip')[0]).toHaveTextContent('Financial Product Strategist');
 fireEvent.click(screen.getByRole('button',{name:'Employee 0, Financial Product Strategist'}));
 expect(props.onOpenAgent.mock.calls[0][1]).toBe(team[0]);
 fireEvent.click(screen.getByRole('button',{name:'Runtime, AI Chief of Staff'}));
 expect(props.onOpenAgent.mock.calls[1][1]).toEqual({id:'runtime'});
});
test('keeps call, work, unread, schedule and unanswered-question evidence scoped to the employee',()=>{
 const rooms=[{id:'agent-0',updatedAt:1,activeCall:true,running:true,unread:true,scheduled:true,waitingForAnswer:true},{id:'agent-1',updatedAt:2,status:'idle'}];
 const r=render(view({rooms}));
 const agent=screen.getByRole('button',{name:'Employee 0, Financial Product Strategist'});
 for(const name of ['In call','Working','Unread update','Work scheduled']) expect(within(agent).getByRole('img',{name})).toBeInTheDocument();
 expect(within(agent).getByText('Waiting for you')).toBeInTheDocument();
 expect(within(screen.getByRole('button',{name:'Employee 1, Specialist'})).queryByRole('img',{name:'In call'})).toBeNull();
 r.rerender(view({rooms:[{id:'agent-0',updatedAt:3,status:'idle'}]}));
 expect(screen.queryByRole('img',{name:'In call'})).toBeNull();
 expect(within(screen.getByRole('button',{name:'Employee 0, Financial Product Strategist'})).getByText('Ready')).toBeInTheDocument();
});
test('never assumes an employee is ready without status evidence, and keeps status on collapsed tiles',()=>{
 const r=render(view());
 expect(screen.getAllByText('Status unavailable').length).toBe(6);
 r.rerender(view({collapsed:true,rooms:[{id:'agent-0',updatedAt:1,activeCall:true,unread:true,scheduled:true}]}));
 expect(screen.getByRole('img',{name:'In call'})).toBeInTheDocument();
 expect(screen.getByRole('img',{name:'Unread update'})).toBeInTheDocument();
 expect(screen.getByRole('img',{name:'Work scheduled'})).toBeInTheDocument();
});
test('snap widths progress through 3, 2, 1 and collapsed; workspace shortcuts reuse native routes',()=>{
 expect([452,330,216,68].map(columnsForWidth)).toEqual([3,2,1,0]);
 render(view());
 expect(screen.getByRole('link',{name:'Apps'})).toHaveAttribute('href',expect.stringContaining('/employee/apps?return_to='));
 fireEvent.click(screen.getByRole('button',{name:'Company HQ'}));
 expect(props.onCompany).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button',{name:'Artifacts'})).toBeDisabled();
});
