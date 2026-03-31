import React from 'react';
import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import SolutionTara from './SolutionTara';
import SolutionHivemind from './SolutionHivemind';
import SolutionEnterprise from './SolutionEnterprise';
import PhaseOneBrandSection from './PhaseOneBrandSection';
import ResearchTeaser from './ResearchTeaser';
import MobileAboutSection from './MobileAboutSection';
import TaraVoiceWidget from './TaraVoiceWidget';
import TaraVoiceWidgetIndic from './TaraVoiceWidgetIndic';
import { useTheme, t } from './ThemeContext';

const PageContent = () => {
    const { isDark } = useTheme();
    const c = t(isDark);

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
            <SolutionTara />
            <SolutionHivemind />
            <SolutionEnterprise />
            <PhaseOneBrandSection />
            <ResearchTeaser />
            <MobileAboutSection />
            {isIndicDomain ? <TaraVoiceWidgetIndic /> : <TaraVoiceWidget />}
        </div>
    );
};

const MobileHomepage = () => (
    <ThemeProvider>
        <PageContent />
    </ThemeProvider>
);

export default MobileHomepage;
