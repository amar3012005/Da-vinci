import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import LatestUpdates from './LatestUpdates';
import SubProducts from './SubProducts';
import FieldPicker from './FieldPicker';
import AudienceSection from './AudienceSection';
import ThesisSection from './ThesisSection';
import ResearchTeaser from './ResearchTeaser';
import MobileAboutSection from './MobileAboutSection';
import SingulanceFooter from './SingulanceFooter';
import TaraVoiceWidget from './TaraVoiceWidget';
import TaraVoiceWidgetIndic from './TaraVoiceWidgetIndic';
import { useTheme, t } from './ThemeContext';

const PageContent = () => {
    const { isDark } = useTheme();
    const c = t(isDark);

    // Field personalization: popup on first visit drives the adaptive narration.
    const [field, setField] = React.useState(() => {
        if (typeof window === 'undefined') return null;
        try { return window.localStorage.getItem('singulance-field'); } catch (e) { return null; }
    });
    const [pickerOpen, setPickerOpen] = React.useState(false);
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        let chosen = null;
        try { chosen = window.localStorage.getItem('singulance-field'); } catch (e) {}
        if (!chosen) { const tmr = setTimeout(() => setPickerOpen(true), 1200); return () => clearTimeout(tmr); }
    }, []);
    const navigate = useNavigate();
    const pickField = (id) => {
        setField(id); setPickerOpen(false);
        try { window.localStorage.setItem('singulance-field', id); } catch (e) {}
        navigate(`/solutions/${id}`);
    };

    const [isIndicDomain, setIsIndicDomain] = React.useState(false);
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'davinciai.in' || hostname.endsWith('.davinciai.in')) {
                setIsIndicDomain(true);
            }
        }
    }, []);

    return (
        <div className={`min-h-screen ${c.bg} ${c.text} overflow-x-hidden transition-colors duration-300`}>
            <MobileNavigation />
            <MobileHero />
            <LatestUpdates />
            <SubProducts />
            <AudienceSection field={field} onChange={() => setPickerOpen(true)} />
            <ThesisSection />
            <ResearchTeaser />
            <MobileAboutSection />
            <SingulanceFooter />
            {isIndicDomain ? <TaraVoiceWidgetIndic /> : <TaraVoiceWidget />}
            <FieldPicker open={pickerOpen} onPick={pickField} onClose={() => setPickerOpen(false)} />
        </div>
    );
};

const MobileHomepage = () => (
    <ThemeProvider>
        <PageContent />
    </ThemeProvider>
);

export default MobileHomepage;


