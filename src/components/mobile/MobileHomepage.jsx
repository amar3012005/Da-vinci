import React from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import FallScene from './FallScene';
import WallScene from './WallScene';
import CinematicMode from './CinematicMode';
import LatestUpdates from './LatestUpdates';
import SubProducts from './SubProducts';
import FieldPicker from './FieldPicker';
import AudienceSection from './AudienceSection';
import ThesisSection from './ThesisSection';
import MobileAboutSection from './MobileAboutSection';
import SingulanceFooter from './SingulanceFooter';
// HIDDEN (re-add on singulancelabs.com): Talk-to-Tara voice widget + orb
// import TaraVoiceWidget from './TaraVoiceWidget';
// import TaraVoiceWidgetIndic from './TaraVoiceWidgetIndic';
import { useTheme, t } from './ThemeContext';

gsap.registerPlugin(ScrollTrigger);

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
    // Lenis smooth-scroll + GSAP ScrollTrigger sync (buttery scrub for FallScene).
    // Skipped under reduced-motion; native scroll otherwise unchanged on mobile.
    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
        window.lenis = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        return () => { gsap.ticker.remove(raf); lenis.destroy(); window.lenis = null; };
    }, []);
    const pickField = (id) => {
        setField(id); setPickerOpen(false);
        try { window.localStorage.setItem('singulance-field', id); } catch (e) {}
        // stay on this page — the choice re-tells the Fall story for that field
    };

    // HIDDEN (re-add on singulancelabs.com): Indic-domain detection for the Tara widget.
    // const [isIndicDomain, setIsIndicDomain] = React.useState(false);
    // React.useEffect(() => {
    //     if (typeof window !== 'undefined') {
    //         const hostname = window.location.hostname;
    //         if (hostname === 'davinciai.in' || hostname.endsWith('.davinciai.in')) {
    //             setIsIndicDomain(true);
    //         }
    //     }
    // }, []);

    return (
        <div className={`min-h-screen ${c.bg} ${c.text} overflow-x-hidden transition-colors duration-300`}>
            <MobileNavigation />
            <CinematicMode />
            <MobileHero />
            <FallScene field={field} />
            <WallScene />
            <LatestUpdates />
            <SubProducts />
            <AudienceSection field={field} onChange={() => setPickerOpen(true)} />
            <ThesisSection />
            <MobileAboutSection />
            <SingulanceFooter />
            {/* HIDDEN (re-add on singulancelabs.com): Talk-to-Tara voice widget + orb
            {isIndicDomain ? <TaraVoiceWidgetIndic /> : <TaraVoiceWidget />} */}
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


