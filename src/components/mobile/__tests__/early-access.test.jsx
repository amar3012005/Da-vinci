import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import EarlyAccessForm from '../EarlyAccessForm';
import Homepage from '../ProactiveHomepage';
afterEach(()=>jest.restoreAllMocks());
test('email-only application uses compatible API fields without marketing subscription',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true});render(<EarlyAccessForm/>);
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'person@example.com'}});
 fireEvent.submit(screen.getByRole('button',{name:/Request early access/}).closest('form'));
 await screen.findByRole('status');
 const body=JSON.parse(fetch.mock.calls[0][1].body);
 expect(body).toMatchObject({email:'person@example.com',name:'Name not provided',account_type:'enterprise',use_case:null});
 expect(body).not.toHaveProperty('marketing_consent');
 expect(screen.getByRole('status').textContent).toContain('Selected applicants hear back by email');
});
test('failed request keeps entered values and allows retry',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:false});render(<EarlyAccessForm/>);
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'person@example.com'}});
 fireEvent.submit(screen.getByRole('button',{name:/Request early access/}).closest('form'));
 await screen.findByRole('alert');expect(screen.getByLabelText('Email address').value).toBe('person@example.com');
 await waitFor(()=>expect(screen.getByRole('button',{name:/Request early access/}).disabled).toBe(false));
});
test('public story has one headline, explicit sign-in and forthcoming demo',()=>{
 render(<Homepage/>);expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
 expect(screen.getByRole('link',{name:'Sign in'}).getAttribute('href')).toContain('/hivemind/login');
 expect(screen.getByRole('link',{name:/Watch the demo/}).getAttribute('href')).toBe('#demo');
 expect(screen.getByText('Product demo · Coming soon')).toBeTruthy();
 expect(screen.getByRole('link',{name:/Explore the collection/}).getAttribute('href')).toBe('/founding-hyperagents');
});
