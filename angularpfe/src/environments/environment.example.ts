/**
 * Copy to environment.ts and fill in optional keys.
 * Maps on "Explorer véhicules" work without keys (Leaflet + OpenStreetMap).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081/api',

  /** Optional — skip if no credit card (app uses Leaflet) */
  googleMapsApiKey: '',

  mapboxAccessToken: '',

  /** AI chatbot: keys go on the BACKEND only — see API-KEYS.md (Gemini: aistudio.google.com/apikey) */
};
