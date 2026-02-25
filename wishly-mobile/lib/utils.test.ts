import { extractDomain } from './utils';

describe('extractDomain', () => {
  it('returns null for null input', () => {
    expect(extractDomain(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractDomain('')).toBeNull();
  });

  it('extracts domain from valid URL with www', () => {
    expect(extractDomain('https://www.google.com')).toBe('google.com');
  });

  it('extracts domain from valid URL without www', () => {
    expect(extractDomain('https://google.com')).toBe('google.com');
  });

  it('extracts domain from URL with subdomains', () => {
    expect(extractDomain('https://blog.sub.example.com')).toBe('blog.sub.example.com');
  });

  it('extracts domain from URL with path, query and fragment', () => {
    expect(extractDomain('https://example.com/path?query=1#fragment')).toBe('example.com');
  });

  it('returns null for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBeNull();
  });

  it('handles different protocols', () => {
    expect(extractDomain('http://example.com')).toBe('example.com');
    expect(extractDomain('ftp://example.com')).toBe('example.com');
  });

  it('removes only leading www.', () => {
    expect(extractDomain('https://www.mywwwsite.com')).toBe('mywwwsite.com');
    expect(extractDomain('https://mywwwsite.com')).toBe('mywwwsite.com');
    expect(extractDomain('https://www.sub.wwwsite.com')).toBe('sub.wwwsite.com');
  });

  it('handles URLs with ports', () => {
    expect(extractDomain('https://example.com:8080')).toBe('example.com');
  });
});
