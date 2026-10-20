import { aggregateMotion, motionForRoom } from '../runtime-motion';
test('preserves native state priority, latest idle state and disconnected uncertainty',()=>{
 expect(aggregateMotion([{updatedAt:3,motion:'done'},{updatedAt:1,motion:'working'}])).toBe('working');
 expect(aggregateMotion([{updatedAt:1,motion:'blocked'},{updatedAt:2,motion:'ready'}])).toBe('ready');
 expect(motionForRoom({motion:'working',stale:true})).toBe('unknown');
 expect(motionForRoom({motion:'external'})).toBe('ready');
});
