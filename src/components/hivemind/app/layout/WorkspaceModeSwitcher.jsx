import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { BotAvatar } from 'bot-avatars';
import BrainModeIcon from './BrainModeIcon';
import VoiceModeIcon from './VoiceModeIcon';

/** One workspace chooser shared by desktop and both mobile sidebars. */
export default function WorkspaceModeSwitcher({ collapsed = false, onChoose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuRef = useRef(null);
  const voiceMode = location.pathname.startsWith('/hivemind/app/tara');
  const teamMode = location.pathname.startsWith('/hivemind/app/employee/harness') || location.pathname === '/hivemind/app/crm';
  useEffect(() => setModeMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!modeMenuOpen) return undefined;
    const dismiss = event => {
      if (event.key === 'Escape') { setModeMenuOpen(false); modeMenuRef.current?.querySelector('button')?.focus(); }
    };
    const outside = event => { if (!modeMenuRef.current?.contains(event.target)) setModeMenuOpen(false); };
    window.addEventListener('keydown', dismiss);
    window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', dismiss); window.removeEventListener('pointerdown', outside); };
  }, [modeMenuOpen]);
  return (
        <div ref={modeMenuRef} className="relative mt-1">
          <button type="button" aria-label="Choose workspace mode" aria-expanded={modeMenuOpen} aria-haspopup="menu" onClick={() => setModeMenuOpen(value => !value)} className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-[#383838] hover:bg-[#eeece6]">
            {voiceMode ? <VoiceModeIcon size={32} /> : teamMode ? <BotAvatar type="mech" shading="fabric" size={32} interactive={false} /> : <BrainModeIcon size={32} />}
            {!collapsed && <><span className="text-[15px] font-medium">{voiceMode ? t('sidebar.voice', { defaultValue: 'Voice' }) : teamMode ? 'HyperAgents' : t('sidebar.brain', { defaultValue: 'Brain' })}</span><ChevronDown size={14} /></>}
          </button>
          {modeMenuOpen && <div role="menu" aria-label="Workspace mode" className="absolute left-0 top-full mt-2 w-[310px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#e3e0db] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] z-50">
            {[{ name: t('sidebar.brain', { defaultValue: 'Brain' }), description: t('sidebar.brainDescription', { defaultValue: 'Remember. Connect. Understand.' }), path: '/hivemind/app/overview/new', selected: !teamMode && !voiceMode, brain: true },
              { name: 'HyperAgents', description: t('sidebar.hyperagentsDescription', { defaultValue: 'Assign. Build. Deliver.' }), path: '/hivemind/app/employee/harness', selected: teamMode },
              { name: t('sidebar.voice', { defaultValue: 'Voice' }), description: t('sidebar.voiceDescription', { defaultValue: 'Speak. Connect. Represent.' }), path: '/hivemind/app/tara', selected: voiceMode, voice: true }].map(mode =>
              <button key={mode.path} role="menuitemradio" aria-checked={mode.selected} type="button" onClick={() => { setModeMenuOpen(false); navigate(mode.path); onChoose?.(); window.dispatchEvent(new PopStateEvent('popstate')); }} className={`flex items-center gap-3 w-full rounded-xl px-3 py-3 text-left text-[#333333] hover:bg-[#efede6] ${mode.selected ? 'bg-[#f7f6f2]' : ''}`}>
                <span className="shrink-0">{mode.brain ? <BrainModeIcon size={32} /> : mode.voice ? <VoiceModeIcon size={32} /> : <BotAvatar type="mech" shading="fabric" size={32} interactive={false} />}</span>
                <span className="flex flex-col gap-1"><span className="text-[17px] font-medium leading-tight">{mode.name}</span><span className="text-[14px] text-[#858585] font-normal leading-snug">{mode.description}</span></span>
              </button>)}
          </div>}
        </div>
  );

}
