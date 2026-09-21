const fs = require('fs');
const path = require('path');

test('company dashboard shares the navbar beige canvas', () => {
  const source = fs.readFileSync(path.join(__dirname, 'CompanyDashboard.jsx'), 'utf8');

  expect(source).toContain('flex-1 min-h-0 flex flex-col overflow-hidden bg-[#faf9f4]');
  expect(source).toContain('border-b border-[#e3e0db] flex items-start justify-between bg-[#faf9f4]');
  expect(source).toContain('shrink-0 pt-3 border-t border-[#ece9e3] bg-[#faf9f4]');
});
