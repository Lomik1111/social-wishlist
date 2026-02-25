import { extractDomain, timeAgo, formatDate } from './utils';

describe('timeAgo', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "только что" for times less than 60 seconds ago', () => {
    const date = new Date('2024-01-01T11:59:30Z').toISOString(); // 30 seconds ago
    expect(timeAgo(date)).toBe('только что');
  });

  it('returns minutes ago correctly', () => {
    expect(timeAgo(new Date('2024-01-01T11:59:00Z').toISOString())).toBe('1 минуту назад');
    expect(timeAgo(new Date('2024-01-01T11:58:00Z').toISOString())).toBe('2 минуты назад');
    expect(timeAgo(new Date('2024-01-01T11:55:00Z').toISOString())).toBe('5 минут назад');
  });

  it('returns hours ago correctly', () => {
    expect(timeAgo(new Date('2024-01-01T11:00:00Z').toISOString())).toBe('1 час назад');
    expect(timeAgo(new Date('2024-01-01T10:00:00Z').toISOString())).toBe('2 часа назад');
    expect(timeAgo(new Date('2024-01-01T07:00:00Z').toISOString())).toBe('5 часов назад');
  });

  it('returns days ago correctly', () => {
    expect(timeAgo(new Date('2023-12-31T12:00:00Z').toISOString())).toBe('1 день назад');
    expect(timeAgo(new Date('2023-12-30T12:00:00Z').toISOString())).toBe('2 дня назад');
    expect(timeAgo(new Date('2023-12-27T12:00:00Z').toISOString())).toBe('5 дней назад');
  });

  it('returns formatted date for older dates', () => {
    const date7DaysAgo = new Date('2023-12-24T12:00:00Z').toISOString();
    expect(timeAgo(date7DaysAgo)).toBe(formatDate(date7DaysAgo));
  });
});

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
