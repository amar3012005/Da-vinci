const fs = require('fs');
const path = require('path');

test('company dashboard shares the navbar beige canvas', () => {
  const source = fs.readFileSync(path.join(__dirname, 'CompanyDashboard.jsx'), 'utf8');

  expect(source).toContain('flex-1 min-h-0 flex flex-col overflow-hidden bg-[#faf9f4]');
  expect(source).toContain('border-b border-[#e3e0db] flex items-start justify-between bg-[#faf9f4]');
});

test('Company HQ columns follow the HQ surface width: one, two, then three', () => {
  const css = fs.readFileSync(path.join(__dirname, 'company-hq.css'), 'utf8');
  expect(css).toContain('container:hm-hq / inline-size');
  expect(css).toMatch(/grid-template-areas:"overview" "runtime" "team" "wakes" "deliverables" "files"/);
  expect(css).toMatch(/@container hm-hq \(min-width:700px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  expect(css).toMatch(/@container hm-hq \(min-width:1100px\)[\s\S]*"overview overview runtime" "team team wakes" "deliverables deliverables files"/);
});
