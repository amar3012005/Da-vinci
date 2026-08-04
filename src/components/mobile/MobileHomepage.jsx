import { ThemeProvider } from './ThemeContext';
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import SingulanceFooter from './SingulanceFooter';

const PageContent = () => (
        <div className="min-h-screen overflow-x-hidden bg-[#05070f] text-white">
            <MobileNavigation />
            <MobileHero />
            <SingulanceFooter />
        </div>
);

const MobileHomepage = () => (
    <ThemeProvider>
        <PageContent />
    </ThemeProvider>
);

export default MobileHomepage;
