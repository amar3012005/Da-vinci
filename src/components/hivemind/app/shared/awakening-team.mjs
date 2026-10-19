/** Keep actual hires distinct from a saved starter-role plan. Never invent employees. */
export function awakeningTeam({team=[],roster=null,starterPlan=[]}={}) {
  const hires=Array.isArray(roster)?roster:Array.isArray(team)?team:[];
  const saved=hires.length?hires:Array.isArray(starterPlan)?starterPlan:[];
  const seen=new Set();
  return saved.filter(member=>{
    if(!member||typeof member.name!=='string'||!member.name.trim())return false;
    const key=member.id||member.name.trim().toLowerCase();
    if(seen.has(key))return false;seen.add(key);return true;
  }).map(member=>({...member,awakeningState:hires.length?'hired':'planned'}));
}
