import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

test('first-time personal signup offers the four product plans before account details', () => {
  const login = read('../LoginPage.jsx');

  for (const plan of ["id: 'free'", "id: 'plus'", "id: 'pro'", "id: 'scale'"]) {
    expect(login).toContain(plan);
  }
  expect(login).toContain("onboardingStep === 2 && accountType === 'personal'");
  expect(login).toContain("onClick={() => selectedPlan && setOnboardingStep(3)}");
  expect(login).toContain("onboardingStep === 3 && accountType === 'personal'");
  expect(login).toContain("selected_plan: selectedPlan || 'free'");
});

test('paid signup choices never self-grant access and continue through Billing', () => {
  const onboarding = read('../../pages/Onboarding.jsx');

  expect(onboarding).toContain("plan: isEnt ? 'enterprise' : 'free'");
  expect(onboarding).toContain("selectedPlan !== 'free'");
  expect(onboarding).toContain('`/hivemind/app/billing?upgrade=${selectedPlan}&source=signup`');
});

test('first-time onboarding uses an edge-to-edge equal split instead of a boxed card', () => {
  const login = read('../LoginPage.jsx');

  expect(login).toContain("showOnboarding ? 'h-screen overflow-hidden p-0'");
  expect(login).toContain("showOnboarding ? 'h-full max-w-none m-0'");
  expect(login).toContain("showOnboarding ? 'h-full w-full border-0 rounded-none shadow-none'");
  expect(login).toContain("h-full overflow-y-auto p-7 md:w-1/2");
  expect(login).toContain("max-w-2xl flex-col justify-center");
  expect(login).toContain("hidden md:flex bg-[#f8f7f2]");
  expect(login).toContain('HIVEMIND PRODUCT LAYERS');
  expect(login).toContain('Select a plan to preview your access');
});

test('login identifies the Singulance brand without the legacy hexagon mark', () => {
  const login = read('../LoginPage.jsx');

  expect(login).toContain('src="/images/singulance-orbit.png"');
  expect(login).toContain('>SINGULANCE</h1>');
  expect(login).toContain('HIVEMIND · MEMORY ENGINE');
  expect(login).not.toContain('<Hexagon');
});
