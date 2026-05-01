import { Locale } from '../../core/models/user.model';

function switchLocale(locale: Locale): void {
  const target = locale === 'EN' ? '/en/' : '/';
  window.location.href = target;
}

describe('i18n locale redirect logic', () => {
  let assignedHref: string;

  beforeEach(() => {
    assignedHref = '';
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { assignedHref = v; } },
      writable: true,
      configurable: true,
    });
  });

  it('redirects to /en/ when locale is EN', () => {
    switchLocale('EN');
    expect(assignedHref).toBe('/en/');
  });

  it('redirects to / when locale is TR', () => {
    switchLocale('TR');
    expect(assignedHref).toBe('/');
  });

  it('EN and TR produce distinct redirect targets', () => {
    const hrefs: string[] = [];
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefs.push(v); } },
      writable: true,
      configurable: true,
    });

    switchLocale('EN');
    switchLocale('TR');

    expect(hrefs[0]).toBe('/en/');
    expect(hrefs[1]).toBe('/');
    expect(hrefs[0]).not.toBe(hrefs[1]);
  });
});
