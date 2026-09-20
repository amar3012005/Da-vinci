import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ChevronDown, CreditCard, Gauge, Hash, LayoutDashboard,
  ListChecks, LogOut, Megaphone, PhoneCall, Power, Search, Settings,
  User, Users,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';

const FALLBACK_ROOMS = [
  { key: 'campaign', label: 'Campaign Intelligence', Icon: Megaphone },
  { key: 'seo', label: 'SEO', Icon: Search },
  { key: 'marketing', label: 'Marketing', Icon: Megaphone },
  { key: 'outreach', label: 'Outreach Intelligence', Icon: LayoutDashboard },
  { key: 'branding', label: 'Branding', Icon: User },
  { key: 'fundraising', label: 'Fundraising', Icon: CreditCard },
  { key: 'research', label: 'Research', Icon: Search },
  { key: 'product', label: 'Product', Icon: LayoutDashboard },
  { key: 'design', label: 'Design', Icon: User },
  { key: 'legal', label: 'Legal & Finance', Icon: CreditCard },
];

function iconFor(tag) {
  return FALLBACK_ROOMS.find((item) => item.key === String(tag || '').toLowerCase())?.Icon || Users;
}

function cleanGoal(goal) {
  return String(goal || '').split('Work autonomously to completion')[0].trim();
}

/** Shared legacy Rooms rail for both the canvas and live WorkRun sessions. */
export default function LegacyRoomsSidebar({ runs = [], rooms = [], activeRunId, onNewWork }) {
  const navigate = useNavigate();
  const { user, org, logout } = useAuth();
  const [companyOpen, setCompanyOpen] = useState(true);
  const liveRooms = useMemo(
    () => (Array.isArray(rooms) ? rooms.filter((room) => !room.archived_at && !room.archivedAt) : []),
    [rooms],
  );
  const companyRooms = liveRooms.filter((room) => (room.is_domain_home || room.isDomainHome) && (room.room_tag || room.roomTag) !== 'general');
  const workRooms = liveRooms.filter((room) => !(room.is_domain_home || room.isDomainHome));
  const companyNav = companyRooms.length
    ? companyRooms.map((room) => ({ id: room.id, label: room.name || room.title || room.room_tag, Icon: iconFor(room.room_tag || room.roomTag) }))
    : FALLBACK_ROOMS.map((room) => ({ id: room.key, label: room.label, Icon: room.Icon }));
  const openRoom = (room) => {
    if (/^[0-9a-f-]{36}$/i.test(String(room.id || ''))) navigate(`/hivemind/app/employees/rooms/${room.id}`);
  };

  return (
    <aside className="w-[240px] min-w-[240px] shrink-0 flex flex-col border-r border-[#e3e0db] bg-[#faf9f4]">
      <div className="px-2 pt-2">
        <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold bg-[#0a0a0a] text-white"><Building2 size={13} />Your Company</button>
        <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#bcd0ef]"><Power size={13} className="text-[#185bcc]" />Runtime</button>
        <button type="button" onClick={() => navigate('/hivemind/app/employees/operating-rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#bcd0ef]"><PhoneCall size={13} className="text-[#117dff]" />Operating Rooms</button>
        <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#e3e0db]"><ListChecks size={13} className="text-[#117dff]" />Your Leads</button>
        <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#e3e0db]"><Megaphone size={13} className="text-[#c2410c]" />Run your Social Media</button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        <div className="mt-1 border-y border-[#e3e0db] bg-white/45">
          <button type="button" onClick={() => setCompanyOpen((open) => !open)} aria-expanded={companyOpen} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-semibold text-[#525252] transition-colors hover:bg-white ${companyOpen ? 'ring-1 ring-inset ring-[#117dff]/40 bg-white' : ''}`}><span className="inline-flex items-center gap-1.5"><Users size={11} />Company rooms</span><ChevronDown size={13} className={`transition-transform ${companyOpen ? 'rotate-180' : ''}`} /></button>
          {companyOpen ? <div className="overflow-hidden border-t border-[#e3e0db] bg-[#faf9f4] pb-1">{companyNav.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => openRoom({ id })} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#0a0a0a] hover:bg-white"><Icon size={13} className="text-[#525252] shrink-0" /><span className="truncate">{label}</span></button>)}</div> : null}
        </div>
        <div className="px-3 pt-3 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] border-t border-[#e3e0db] mt-1">Work rooms</div>
        <button type="button" onClick={onNewWork} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white"><Hash size={12} className="text-[#117dff] shrink-0" /><span className="text-[12px] font-semibold text-[#0a0a0a]">New WorkRun</span></button>
        {runs.slice(0, 16).map((run) => <button key={run.id} type="button" onClick={() => navigate(`/hivemind/app/hm-rooms/${run.id}`)} className={`w-full flex items-center gap-2 border-l-2 px-3 py-1.5 text-left hover:bg-white ${run.id === activeRunId ? 'border-[#117dff] bg-white' : 'border-transparent'}`}><Hash size={12} className="text-[#a3a3a3] shrink-0" /><span className="text-[12px] text-[#0a0a0a] truncate">{cleanGoal(run.goal) || run.id.slice(0, 8)}</span></button>)}
        {workRooms.slice(0, 6).map((room) => <button key={room.id} type="button" onClick={() => openRoom(room)} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white"><Hash size={12} className="text-[#a3a3a3] shrink-0" /><span className="text-[12px] text-[#0a0a0a] truncate">{room.name || room.title || 'Room'}</span></button>)}
      </div>

      <div className="border-t border-[#e3e0db] px-2 pt-2.5 pb-2 shrink-0 bg-[#faf9f4]">
        <div className="text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] px-2 mb-1">Account</div>
        {[{ Icon: User, label: 'Profile', to: '/hivemind/app/profile' }, { Icon: Gauge, label: 'Usage', to: '/hivemind/app/usage' }, { Icon: CreditCard, label: 'Billing', to: '/hivemind/app/billing' }, { Icon: Settings, label: 'Settings', to: '/hivemind/app/settings' }].map(({ Icon, label, to }) => <button key={to} type="button" onClick={() => navigate(to)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#0a0a0a] hover:bg-white"><Icon size={13} />{label}</button>)}
        <div className="flex items-center gap-2 px-2 py-2 mt-1 border-t border-[#e3e0db]"><span className="w-7 h-7 rounded-lg bg-[#117dff]/10 text-[#117dff] flex items-center justify-center text-[11px] font-bold">{(user?.display_name || user?.email || '?')[0].toUpperCase()}</span><div className="min-w-0"><div className="text-[11.5px] font-semibold text-[#0a0a0a] truncate">{user?.display_name || user?.email}</div><div className="text-[9.5px] font-mono text-[#a3a3a3] capitalize">{org?.plan || 'free'} Plan</div></div></div>
        <button type="button" onClick={async () => { try { await logout(); } catch { /* no-op */ } navigate('/hivemind/login'); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#dc2626]"><LogOut size={13} />Sign Out</button>
      </div>
    </aside>
  );
}
