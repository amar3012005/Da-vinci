import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NativeEmployeeCreateDialog from './NativeEmployeeCreateDialog';
import apiClient from '../shared/api-client';
jest.mock('../shared/api-client', () => ({ __esModule: true, default: { nativeEmployeeLifecycle: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'creation-key' } }); });
test('administrator creation uses native registry and stable replay identity', async () => {
 apiClient.nativeEmployeeLifecycle.mockResolvedValue({ employee: { id: 'employee' }, native_activation: { status: 'ready' } });
 const onClose=jest.fn(), onCreated=jest.fn();
 render(<NativeEmployeeCreateDialog open onClose={onClose} onCreated={onCreated} />);
 fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Researcher'}});
 fireEvent.change(screen.getByLabelText('Responsibilities'),{target:{value:'Review company evidence'}});
 fireEvent.click(screen.getByText('Create employee'));
 await waitFor(()=>expect(onClose).toHaveBeenCalled());
 expect(apiClient.nativeEmployeeLifecycle).toHaveBeenCalledWith({operation:'create',creation_key:'creation-key',name:'Researcher',persona:'Review company evidence',lifecycle:'durable'});
});
test('temporary setup retries the same saved request without creating another employee', async () => {
 apiClient.nativeEmployeeLifecycle.mockResolvedValue({employee:{id:'employee'},native_activation:{status:'pending'}});
 const onClose=jest.fn();render(<NativeEmployeeCreateDialog open onClose={onClose} onCreated={jest.fn()} />);
 fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Researcher'}});
 fireEvent.change(screen.getByLabelText('Responsibilities'),{target:{value:'Review evidence'}});
 fireEvent.change(screen.getByLabelText('Employment'),{target:{value:'temporary'}});
 fireEvent.change(screen.getByLabelText('Work ends'),{target:{value:'2099-01-01T10:00'}});
 fireEvent.click(screen.getByText('Create employee'));
 await screen.findByText('Retry setup'); expect(onClose).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Retry setup'));
 await waitFor(()=>expect(apiClient.nativeEmployeeLifecycle).toHaveBeenCalledTimes(2));
 expect(apiClient.nativeEmployeeLifecycle.mock.calls[1][0]).toEqual(apiClient.nativeEmployeeLifecycle.mock.calls[0][0]);
});
