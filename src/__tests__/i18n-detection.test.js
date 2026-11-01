import { languageDetection, LANGUAGE_COOKIE } from '../i18n-detection';

describe('language detection shared by the Brain and Runtime hosts', () => {
  test.each(['next.singulancelabs.com', 'runtime-runner.singulancelabs.com'])('%s reads and writes the parent-domain cookie first', (host) => {
    const detection = languageDetection(host, 'https:');
    expect(detection.order.slice(0, 2)).toEqual(['cookie', 'localStorage']);
    expect(detection.caches).toEqual(['cookie', 'localStorage']);
    expect(detection.lookupCookie).toBe(LANGUAGE_COOKIE);
    expect(detection.cookieDomain).toBe('.singulancelabs.com');
    expect(detection.cookieOptions).toEqual({ path: '/', sameSite: 'lax', secure: true });
  });

  test('a host outside the product domain keeps the cookie on itself', () => {
    const detection = languageDetection('localhost', 'http:');
    expect(detection.cookieDomain).toBeUndefined();
    expect(detection.cookieOptions.secure).toBeUndefined();
  });

  test('a lookalike host does not receive the product domain', () => {
    expect(languageDetection('evilsingulancelabs.com', 'https:').cookieDomain).toBeUndefined();
  });
});
