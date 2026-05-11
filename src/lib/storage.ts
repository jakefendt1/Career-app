const PREFIX = 'career_';

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

export function clearAll(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k));
}

export const KEYS = {
  roles: 'roles',
  resumeDrafts: 'resumeDrafts',
  resumeJobs: 'resumeJobs',
  profile: 'profile',
  preferences: 'preferences',
} as const;
