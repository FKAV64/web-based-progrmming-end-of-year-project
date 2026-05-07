import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('set() persists a value that get() can read back', () => {
    service.set('theme', 'dark');
    expect(service.get('theme')).toBe('dark');
  });

  it('get() returns null for an unknown key', () => {
    expect(service.get('does-not-exist')).toBeNull();
  });

  it('remove() deletes a previously stored value', () => {
    service.set('locale', 'tr');
    expect(service.get('locale')).toBe('tr');

    service.remove('locale');
    expect(service.get('locale')).toBeNull();
  });

  it('get() swallows errors when localStorage throws and returns null', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(service.get('any')).toBeNull();
  });

  it('set() swallows errors when localStorage throws (no exception leaks)', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => service.set('k', 'v')).not.toThrow();
  });

  it('remove() swallows errors when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(() => service.remove('k')).not.toThrow();
  });
});
