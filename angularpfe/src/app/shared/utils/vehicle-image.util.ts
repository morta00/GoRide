import { environment } from '../../../environments/environment';

/** Backend origin without /api suffix (e.g. http://localhost:8081). */
export function apiOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/, '');
}

/**
 * Resolve vehicle photo URL for display (client, driver, fleet).
 * Demo plates (DEMO-*): prefer Angular assets (same files as in git — no auth).
 * Fallback: backend /vehicle-photos/ when photoUrl is stored in DB.
 */
export function resolveVehiclePhotoUrl(
  photoUrl?: string | null,
  licensePlate?: string | null
): string {
  const plate = licensePlate?.trim().toUpperCase();
  const base = apiOrigin();

  // Demo fleet: local assets (works on ng serve for you and collaborators)
  if (plate?.startsWith('DEMO-')) {
    return `assets/images/cars/${plate}.jpg`;
  }

  if (!photoUrl?.trim()) {
    return '';
  }

  const url = photoUrl.trim();

  if (url.startsWith('/vehicle-photos/')) {
    return `${base}${url}`;
  }

  if (url.startsWith('vehicle-photos/')) {
    return `${base}/${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${base}${url}`;
  }

  if (url.startsWith('assets/')) {
    return url;
  }

  return url;
}

/** Called from (error) on img — try backend static URL if assets path failed. */
export function vehiclePhotoFallback(
  photoUrl?: string | null,
  licensePlate?: string | null,
  currentSrc?: string
): string {
  const plate = licensePlate?.trim().toUpperCase();
  if (!plate?.startsWith('DEMO-')) {
    return '';
  }
  const backend = `${apiOrigin()}/vehicle-photos/${plate}.jpg`;
  if (currentSrc && currentSrc.includes(backend)) {
    return '';
  }
  return backend;
}
