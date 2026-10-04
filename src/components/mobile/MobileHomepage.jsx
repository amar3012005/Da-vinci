import React from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
// PAUSED: Act II "THE FALL". The Horizon film now carries the opening on its
// own and runs straight into the updates via SceneBridge. Re-add below
// <HorizonScene /> to bring the pain narrative back.
// import FallScene from './FallScene';
import ThesisSection from './ThesisSection';
import SingulanceFooter from './SingulanceFooter';
// HIDDEN (re-add on singulancelabs.com): Talk-to-Tara voice widget + orb
// import TaraVoiceWidget from './TaraVoiceWidget';
// import TaraVoiceWidgetIndic from './TaraVoiceWidgetIndic';
import { useTheme, t } from './ThemeContext';
import { hasConsent } from '../../privacy/consent';

gsap.registerPlugin(ScrollTrigger);

// Desktop-only scenes include WebGL dependencies. Keep them outside the mobile
// startup path; resizing to desktop still loads the same components on demand.
const HorizonScene = React.lazy(() => import('./HorizonScene'));
const SceneBridge = React.lazy(() => import('./SceneBridge'));
const CinematicMode = React.lazy(() => import('./CinematicMode'));
const LatestUpdates = React.lazy(() => import('./LatestUpdates'));
const SubProducts = React.lazy(() => import('./SubProducts'));
const FieldPicker = React.lazy(() => import('./FieldPicker'));
const AudienceSection = React.lazy(() => import('./AudienceSection'));
const MobileAboutSection = React.lazy(() => import('./MobileAboutSection'));

const PageContent = () => {
    const { isDark } = useTheme();
    const c = t(isDark);
    const [isMobile, setIsMobile] = React.useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    ));

    React.useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const sync = () => setIsMobile(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    // Field personalization: popup on first visit drives the adaptive narration.
    const [field, setField] = React.useState(() => {
        if (typeof window === 'undefined') return null;
        try { return window.sessionStorage.getItem('singulance-field') || (hasConsent('preferences') ? window.localStorage.getItem('singulance-field') : null); } catch (e) { return null; }
    });
    const [pickerOpen, setPickerOpen] = React.useState(false);
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        let chosen = null;
        try { chosen = window.sessionStorage.getItem('singulance-field') || (hasConsent('preferences') ? window.localStorage.getItem('singulance-field') : null); } catch (e) {}
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
        try {
            window.sessionStorage.setItem('singulance-field', id);
            if (hasConsent('preferences')) window.localStorage.setItem('singulance-field', id);
        } catch (e) {}
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
            {!isMobile && <React.Suspense fallback={null}><CinematicMode /></React.Suspense>}
            <MobileHero />
            {!isMobile && <React.Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
                <HorizonScene />
                {/* <FallScene field={field} /> */}
                <SceneBridge />
                <LatestUpdates />
                <SubProducts />
                <AudienceSection field={field} onChange={() => setPickerOpen(true)} />
            </React.Suspense>}
            <ThesisSection />
            {!isMobile && <React.Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><MobileAboutSection /></React.Suspense>}
            <SingulanceFooter />
            {/* HIDDEN (re-add on singulancelabs.com): Talk-to-Tara voice widget + orb
            {isIndicDomain ? <TaraVoiceWidgetIndic /> : <TaraVoiceWidget />} */}
            {!isMobile && <React.Suspense fallback={null}><FieldPicker open={pickerOpen} onPick={pickField} onClose={() => setPickerOpen(false)} /></React.Suspense>}
        </div>
    );
};

const MobileHomepage = () => (
    <ThemeProvider>
        <PageContent />
    </ThemeProvider>
);

export default MobileHomepage;
