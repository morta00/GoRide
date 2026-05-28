import { AiPreference, AiRecommendation } from '../../services/ai-recommendation.service';

export interface RideAdviceCopy {
  headline: string;
  reason: string;
  tips: string[];
}

const FR: Record<string, RideAdviceCopy> = {
  comfort: {
    headline: 'Course confortable',
    reason: 'Pour le confort, choisissez une course individuelle et précisez climatisation ou bagages dans votre demande.',
    tips: [
      'Type de course : individuelle pour plus d’intimité.',
      'Mentionnez vos extras (bagages, climatisation) dans les notes.',
      'Vérifiez le profil du chauffeur après acceptation.'
    ]
  },
  economy: {
    headline: 'Course économique',
    reason: 'Pour économiser, privilégiez le type collaboratif si disponible et évitez les heures de pointe.',
    tips: [
      'Comparez individuel vs collaboratif selon votre trajet.',
      'Évitez les créneaux 8h–9h et 17h–19h si possible.',
      'Soyez précis sur l’adresse pour éviter les détours.'
    ]
  },
  family: {
    headline: 'Course pour groupe',
    reason: 'Pour voyager en groupe, indiquez le nombre exact de passagers et les bagages dès la demande.',
    tips: [
      'Précisez le nombre de passagers et la taille des bagages.',
      'Choisissez un point de prise en charge spacieux.',
      'Contactez le chauffeur via Messages si besoin.'
    ]
  },
  flexible: {
    headline: 'Course flexible',
    reason: 'Pour la flexibilité, indiquez une plage horaire dans les notes et restez joignable pour un léger ajustement d’horaire.',
    tips: [
      'Ajoutez une plage horaire (ex. entre 14h et 16h) dans les notes.',
      'Restez joignable : le chauffeur peut proposer un petit décalage.',
      'Confirmez le point de rendez-vous par message.'
    ]
  }
};

const EN: Record<string, RideAdviceCopy> = {
  comfort: {
    headline: 'Comfortable ride',
    reason: 'For comfort, choose an individual ride and mention AC or luggage in your request.',
    tips: [
      'Ride type: individual for more privacy.',
      'Mention extras (luggage, AC) in the notes.',
      'Check the driver profile after acceptance.'
    ]
  },
  economy: {
    headline: 'Economical ride',
    reason: 'To save money, use collaborative ride type when available and avoid peak hours.',
    tips: [
      'Compare individual vs collaborative for your route.',
      'Avoid 8–9 AM and 5–7 PM peaks when possible.',
      'Be precise with the pickup address.'
    ]
  },
  family: {
    headline: 'Group ride',
    reason: 'For group travel, state exact passenger count and luggage in your request.',
    tips: [
      'Specify passenger count and luggage size.',
      'Pick a spacious pickup point.',
      'Message the driver if you need more space.'
    ]
  },
  flexible: {
    headline: 'Flexible ride',
    reason: 'For flexibility, add a time window in the notes and stay reachable for small schedule changes.',
    tips: [
      'Add a time window (e.g. between 2 PM and 4 PM) in the notes.',
      'Stay reachable—the driver may suggest a small schedule shift.',
      'Confirm the meeting point via Messages.'
    ]
  }
};

export function buildRideAdvice(preference: AiPreference, locale: string, aiPowered: boolean): AiRecommendation {
  const map = locale === 'en' ? EN : FR;
  const copy = map[preference] ?? map['comfort'];
  return {
    headline: copy.headline,
    reason: copy.reason,
    tips: copy.tips,
    preference,
    provider: 'goride',
    aiEnabled: aiPowered
  };
}

export function preferenceLabel(preference: AiPreference, locale: string): string {
  const fr: Record<string, string> = {
    comfort: 'Confort',
    economy: 'Moins cher',
    family: 'Groupe',
    flexible: 'Flexible',
    long_trip: 'Long trajet',
    eco: 'Éco'
  };
  const en: Record<string, string> = {
    comfort: 'Comfort',
    economy: 'Cheapest',
    family: 'Group',
    flexible: 'Flexible',
    long_trip: 'Long trip',
    eco: 'Eco'
  };
  const map = locale === 'en' ? en : fr;
  return map[preference] ?? preference;
}
