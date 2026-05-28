/** Returns true when URL is a real user-uploaded photo (not a stock placeholder). */
export function isValidUserPhotoUrl(url?: string | null): boolean {
  if (!url || !String(url).trim()) return false;
  const u = String(url).trim().toLowerCase();
  const invalidFragments = [
    'person_1.jpg',
    'person_2.jpg',
    'default-avatar',
    'placeholder',
    'pravatar.cc',
    'ui-avatars.com',
    'gravatar.com/avatar/000',
    'blank.gif'
  ];
  return !invalidFragments.some((frag) => u.includes(frag));
}

/** Split a full display name into first / last for initials. */
export function parseDisplayName(full?: string | null): { first: string; last: string } {
  if (!full?.trim()) return { first: '', last: '' };
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** Stable gradient pair from a string (name or id). */
export function avatarGradientFromSeed(seed: string): [string, string] {
  const pairs: [string, string][] = [
    ['#2563eb', '#1d4ed8'],
    ['#7c3aed', '#5b21b6'],
    ['#0891b2', '#0e7490'],
    ['#059669', '#047857'],
    ['#ea580c', '#c2410c'],
    ['#db2777', '#be185d'],
    ['#4f46e5', '#4338ca'],
    ['#0d9488', '#0f766e']
  ];
  if (!seed) return pairs[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return pairs[Math.abs(hash) % pairs.length];
}
