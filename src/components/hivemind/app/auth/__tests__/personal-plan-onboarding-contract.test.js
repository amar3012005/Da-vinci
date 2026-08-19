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

