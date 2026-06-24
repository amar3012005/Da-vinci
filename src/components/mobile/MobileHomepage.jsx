import React from 'react';
import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import LatestUpdates from './LatestUpdates';
import SubProducts from './SubProducts';
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
            <ThesisSection />
            <ResearchTeaser />
            <MobileAboutSection />
            <SingulanceFooter />
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


