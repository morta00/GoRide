import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  AiPreference,
  AiRecommendation,
  AiRecommendationService
} from '../../services/ai-recommendation.service';
import { LanguageService } from '../../i18n/language.service';
import { buildRideAdvice, preferenceLabel } from './ai-ride-advice';

export type AiInsightMode = 'vehicles' | 'trips' | 'ride';

export interface PreferenceOption {
  id: AiPreference;
  label: string;
  icon: string;
  hint: string;
  accent: string;
}

@Component({
  selector: 'app-ai-insight-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ai-insight-panel.component.html',
  styleUrls: ['./ai-insight-panel.component.css']
})
export class AiInsightPanelComponent implements OnInit {
  @Input() mode: AiInsightMode = 'vehicles';
  @Input() title = 'Conseiller GoRide IA';
  @Input() subtitle = 'Choisissez votre priorité, nous vous guidons.';
  @Input() location = '';
  @Input() startDate = '';
  @Input() endDate = '';
  @Input() departure = '';
  @Input() destination = '';
  @Input() rideType = 'INDIVIDUAL';
  @Input() passengers = 1;
  /** Limite la recommandation aux véhicules affichés (ex. liste filtrée location) */
  @Input() vehicleIds: number[] | null = null;
  @Input() brand = '';
  @Input() maxPrice: number | null = null;
  @Input() transmission = '';

  @Output() recommended = new EventEmitter<AiRecommendation>();

  preference: AiPreference = 'comfort';
  loading = false;
  error = '';
  result: AiRecommendation | null = null;
  aiPowered = false;
  /** Dernière préférence utilisée pour le résultat affiché */
  resultPreference: AiPreference | null = null;

  readonly preferences: PreferenceOption[] = [
    { id: 'comfort', label: 'Confort', icon: 'ion-md-ribbon', hint: 'Luxe, automatique, meilleure note', accent: 'violet' },
    { id: 'economy', label: 'Économique', icon: 'ion-md-cash', hint: 'Prix le plus bas', accent: 'green' },
    { id: 'family', label: 'Famille', icon: 'ion-md-people', hint: 'Maximum de places', accent: 'blue' },
    { id: 'long_trip', label: 'Long trajet', icon: 'ion-md-map', hint: 'SUV, diesel/hybride, autoroute', accent: 'indigo' },
    { id: 'eco', label: 'Éco', icon: 'ion-md-leaf', hint: 'Hybride ou électrique', accent: 'teal' },
    { id: 'flexible', label: 'Flexible', icon: 'ion-md-time', hint: 'Bon rapport qualité-prix', accent: 'amber' }
  ];

  readonly tripPreferences: PreferenceOption[] = [
    { id: 'comfort', label: 'Confort', icon: 'ion-md-ribbon', hint: 'Course individuelle, véhicule agréable', accent: 'violet' },
    { id: 'economy', label: 'Moins cher', icon: 'ion-md-cash', hint: 'Réduire le coût de la course', accent: 'green' },
    { id: 'family', label: 'Groupe', icon: 'ion-md-people', hint: 'Plusieurs passagers et bagages', accent: 'blue' },
    { id: 'flexible', label: 'Flexible', icon: 'ion-md-time', hint: 'Plage horaire, horaire ajustable', accent: 'amber' }
  ];

  constructor(
    private aiService: AiRecommendationService,
    private language: LanguageService
  ) {}

  ngOnInit(): void {
    this.aiService.getStatus().subscribe({
      next: s => (this.aiPowered = s.aiEnabled),
      error: () => (this.aiPowered = false)
    });
  }

  get preferenceOptions(): PreferenceOption[] {
    return this.mode === 'trips' || this.mode === 'ride' ? this.tripPreferences : this.preferences;
  }

  get isRideMode(): boolean {
    return this.mode === 'ride';
  }

  get activeOption(): PreferenceOption | undefined {
    return this.preferenceOptions.find(p => p.id === this.preference);
  }

  get resultMismatch(): boolean {
    return this.result != null && this.resultPreference != null && this.resultPreference !== this.preference;
  }

  private locale(): string {
    return this.language.current;
  }

  selectPreference(id: AiPreference): void {
    this.preference = id;
    if (this.result && this.resultPreference !== id) {
      this.result = null;
      this.resultPreference = null;
    }
  }

  analyze(): void {
    this.loading = true;
    this.error = '';
    this.result = null;
    this.resultPreference = null;
    const loc = this.locale();
    const pref = this.preference;

    if (this.mode === 'ride') {
      const rec = buildRideAdvice(pref, loc, this.aiPowered);
      this.result = rec;
      this.resultPreference = pref;
      this.loading = false;
      this.recommended.emit(rec);
      return;
    }

    const done = (rec: AiRecommendation) => {
      this.result = { ...rec, preference: pref };
      this.resultPreference = pref;
      this.loading = false;
      this.recommended.emit(this.result);
    };
    const fail = (err: { message?: string }) => {
      this.error = err?.message || 'Impossible d\'obtenir une recommandation. Réessayez.';
      this.loading = false;
    };

    if (this.mode === 'vehicles') {
      const scopedIds = this.vehicleIds?.filter(id => id != null);
      if (scopedIds != null && scopedIds.length === 0) {
        this.error = loc === 'en'
          ? 'No vehicles to analyze. Adjust filters or wait for the list to load.'
          : 'Aucun véhicule à analyser. Modifiez les filtres ou attendez le chargement.';
        this.loading = false;
        return;
      }
      this.aiService
        .recommendVehicle({
          preference: pref,
          location: this.location,
          startDate: this.startDate,
          endDate: this.endDate,
          passengers: this.passengers,
          locale: loc,
          brand: this.brand || undefined,
          maxPrice: this.maxPrice ?? undefined,
          transmission: this.transmission || undefined,
          vehicleIds: scopedIds && scopedIds.length > 0 ? scopedIds : undefined
        })
        .subscribe({ next: done, error: err => fail(this.aiService.toError(err)) });
      return;
    }

    this.aiService
      .recommendTrip({
        preference: pref,
        departure: this.departure,
        destination: this.destination,
        passengers: this.passengers,
        locale: loc
      })
      .subscribe({ next: done, error: err => fail(this.aiService.toError(err)) });
  }

  resultPreferenceLabel(): string {
    const p = this.resultPreference ?? this.preference;
    return preferenceLabel(p, this.locale());
  }

  highlightRecommended(id: number | undefined): void {
    if (id == null) return;
    const el = document.getElementById(`ai-target-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('ai-highlight-pulse');
    setTimeout(() => el?.classList.remove('ai-highlight-pulse'), 2500);
  }
}
