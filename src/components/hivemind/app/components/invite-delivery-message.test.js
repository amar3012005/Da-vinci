import { inviteDeliveryMessage } from './invite-delivery-message';
test('pending queue is never reported as sent or delivered',()=>{expect(inviteDeliveryMessage({attempted:true,pending:true})).toMatch(/queued.*not confirmed/);});
test('provider success is acceptance, not inbox evidence or invented 24h expiry',()=>{const message=inviteDeliveryMessage({ok:true},'date');expect(message).toMatch(/accepted for delivery/);expect(message).not.toMatch(/24 hours|Email sent/);});
test('saved invite delivery failure retains retry/link options',()=>{expect(inviteDeliveryMessage({attempted:true,ok:false,error:'provider unavailable'})).toMatch(/saved.*failed.*provider unavailable.*copy the link/);});
test('no receipt never implies delivery',()=>{expect(inviteDeliveryMessage()).toMatch(/no email delivery is confirmed/);});
