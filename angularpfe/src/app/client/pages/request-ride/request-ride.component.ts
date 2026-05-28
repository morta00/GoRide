import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RideRequestService, RideRequest } from '../../../services/ride-request.service';

interface Driver {
  id: string;
  name: string;
  rating: number;
  tripsCount: number;
  vehicle: string;
  eta: string;
  distance: string;
}

type PickupMode = 'CURRENT_LOCATION' | 'CUSTOM_ADDRESS';

@Component({
  selector: 'app-request-ride',
  template: `
<div class="request-container animate__animated animate__fadeIn">
  
  <header class="page-header mb-4">
    <h1>Commander un trajet</h1>
    <p class="text-muted">Demandez une course individuelle ou collaborative en quelques clics.</p>
  </header>

  <app-ai-insight-panel
    class="d-block mb-4"
    mode="ride"
    title="Conseil IA — votre course"
    subtitle="Confort, prix ou groupe : recommandation avant d'envoyer la demande."
    [departure]="form.departure"
    [destination]="form.destination"
    [rideType]="form.rideType"
    [passengers]="form.passengers">
  </app-ai-insight-panel>

  <!-- SUCCESS VIEW -->
  <div class="success-view animate__animated animate__zoomIn" *ngIf="submittedRequest">
    <div class="success-card text-center p-5">
      <div class="success-icon mb-4">
        <span class="ion-md-checkmark-circle text-success"></span>
      </div>
      <h2 class="fw-bold mb-3">Demande envoyée !</h2>
      <p class="text-muted mb-4" *ngIf="!submittedRequest.driverName">
        Votre demande a été envoyée aux chauffeurs disponibles.
      </p>
      <p class="text-muted mb-4" *ngIf="submittedRequest.driverName">
        Votre demande a été envoyée à <strong>{{ submittedRequest.driverName }}</strong>.
      </p>

      <div class="request-summary-box mb-5">
        <div class="summary-item">
          <span class="label">Trajet</span>
          <span class="value">{{ submittedRequest.departure }} → {{ submittedRequest.destination }}</span>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Date & Heure</span>
            <span class="value">{{ submittedRequest.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Type</span>
            <span class="value">{{ submittedRequest.rideType === 'INDIVIDUAL' ? 'Individuel' : 'Collaboratif' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Prix</span>
            <span class="value text-primary fw-bold">{{ submittedRequest.estimatedPrice }} DT</span>
          </div>
          <div class="summary-item">
            <span class="label">Statut</span>
            <span class="status-badge">En attente chauffeur</span>
          </div>
        </div>
      </div>

      <div class="success-actions">
        <button class="btn-primary w-100 mb-3 py-3" (click)="goToCurrentRide()">Suivre ma demande</button>
        <div class="d-flex gap-3">
          <button class="btn-outline-primary flex-grow-1 py-2" (click)="goToReservations()">Voir mes trajets</button>
          <button class="btn-text flex-grow-1 py-2" (click)="resetForm()">Nouvelle commande</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MAIN FORM VIEW -->
  <div class="content-grid" *ngIf="!submittedRequest">
    
    <div class="form-column">
      
      <!-- Persistent Encart (Last Request) -->
      <div class="last-request-alert mb-4" *ngIf="lastRequest && !estimation">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <span class="small fw-bold d-block text-primary">DERNIÈRE DEMANDE ENVOYÉE</span>
            <span class="small">{{ lastRequest.departure }} → {{ lastRequest.destination }} ({{ lastRequest.estimatedPrice }} DT)</span>
          </div>
          <button class="btn-sm-primary" (click)="goToReservations()">Voir mes trajets</button>
        </div>
      </div>

      <!-- 1. Formulaire Principal -->
      <div class="card p-4 mb-4">
        <h5 class="fw-bold mb-4"><span class="ion-md-create me-2 text-primary"></span> Informations du trajet</h5>
        
        <!-- Errors -->
        <div class="alert alert-danger mb-3 py-2 small" *ngIf="errors.length > 0">
          <ul class="mb-0 ps-3">
            <li *ngFor="let error of errors">{{ error }}</li>
          </ul>
        </div>

        <div class="row g-3">
          <div class="col-12">
            <label class="form-label fw-bold text-uppercase text-muted small mb-2 d-block">Point de départ</label>
            <div class="pickup-mode-group">
              <button type="button"
                      class="pickup-mode-btn"
                      [class.active]="pickupMode === 'CURRENT_LOCATION'"
                      (click)="setPickupMode('CURRENT_LOCATION')">
                <span class="ion-md-locate me-1"></span> Ma position actuelle
              </button>
              <button type="button"
                      class="pickup-mode-btn"
                      [class.active]="pickupMode === 'CUSTOM_ADDRESS'"
                      (click)="setPickupMode('CUSTOM_ADDRESS')">
                <span class="ion-md-pin me-1"></span> Une autre adresse
              </button>
            </div>
            <div class="small mt-2 text-muted" *ngIf="pickupMode === 'CURRENT_LOCATION'">
              <span *ngIf="geoState === 'idle'">Utilisez ce mode pour commander un trajet depuis votre position GPS.</span>
              <span *ngIf="geoState === 'loading'">Localisation en cours...</span>
              <span class="text-success" *ngIf="geoState === 'ready'">Position détectée et appliquée au départ.</span>
              <span class="text-danger" *ngIf="geoState === 'error'">{{ geoError }}</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="input-group-custom">
              <label>Départ</label>
              <div class="input-wrapper">
                <span class="ion-md-pin text-success"></span>
                <input type="text"
                       [(ngModel)]="form.departure"
                       [readonly]="pickupMode === 'CURRENT_LOCATION'"
                       [placeholder]="pickupMode === 'CURRENT_LOCATION' ? 'Position GPS détectée...' : 'Adresse de départ'">
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="input-group-custom">
              <label>Destination</label>
              <div class="input-wrapper">
                <span class="ion-md-pin text-danger"></span>
                <input type="text" [(ngModel)]="form.destination" placeholder="Où allez-vous ?">
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="input-group-custom">
              <label>Type de trajet</label>
              <select [(ngModel)]="form.rideType" class="form-select-custom">
                <option value="INDIVIDUAL">Individuel</option>
                <option value="COLLABORATIVE">Collaboratif</option>
              </select>
            </div>
          </div>
          <div class="col-md-6">
            <div class="input-group-custom">
              <label>Réservation pour</label>
              <select [(ngModel)]="form.bookingFor" class="form-select-custom">
                <option value="SELF">Moi-même</option>
                <option value="OTHER">Une autre personne</option>
              </select>
            </div>
          </div>
          <div class="col-md-3">
            <div class="input-group-custom">
              <label>Date</label>
              <input type="date" [(ngModel)]="form.date" class="form-control-custom">
            </div>
          </div>
          <div class="col-md-3">
            <div class="input-group-custom">
              <label>Heure</label>
              <input type="time" [(ngModel)]="form.time" class="form-control-custom">
            </div>
          </div>
          <div class="col-md-4">
            <div class="input-group-custom">
              <label>Nombre de passagers</label>
              <input type="number" [(ngModel)]="form.passengers" min="1" max="4" class="form-control-custom">
            </div>
          </div>
          <div class="col-md-8">
            <div class="input-group-custom">
              <label>Méthode de paiement</label>
              <select [(ngModel)]="form.paymentMethod" class="form-select-custom">
                <option>Carte bancaire</option>
                <option>Espèces</option>
                <option>Carte GoRide</option>
                <option>Solde GoRide</option>
              </select>
            </div>
          </div>
          <div class="col-md-6" *ngIf="form.bookingFor === 'OTHER'">
            <div class="input-group-custom">
              <label>Nom du passager à récupérer</label>
              <input type="text" [(ngModel)]="form.riderName" class="form-control-custom" placeholder="Ex: Ahmed Ben Salah">
            </div>
          </div>
          <div class="col-md-6" *ngIf="form.bookingFor === 'OTHER'">
            <div class="input-group-custom">
              <label>Téléphone du passager</label>
              <input type="text" [(ngModel)]="form.riderPhone" class="form-control-custom" placeholder="Ex: +216 98 123 456">
            </div>
          </div>
          <div class="col-12">
            <div class="input-group-custom">
              <label>Commentaire (Optionnel)</label>
              <textarea [(ngModel)]="form.comment" placeholder="Précisez un détail pour le chauffeur..." class="form-control-custom" rows="2"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Extras -->
      <div class="card p-4 mb-4">
        <h5 class="fw-bold mb-4"><span class="ion-md-add-circle me-2 text-primary"></span> Options & Extras</h5>
        <div class="extras-grid">
          <div class="extra-item" 
               *ngFor="let extra of extras" 
               [class.active]="selectedExtras.includes(extra.id)"
               (click)="toggleExtra(extra.id)">
            <span [class]="extra.icon"></span>
            <div class="ms-2">
              <span class="label">{{ extra.label }}</span>
              <span class="price">+{{ extra.price }} DT</span>
            </div>
            <span class="check-icon ion-md-checkmark-circle" *ngIf="selectedExtras.includes(extra.id)"></span>
          </div>
        </div>
      </div>

      <button class="btn-primary-glow w-100 py-3 rounded-4 fw-bold" (click)="estimatePrice()" [disabled]="isEstimating">
        <span *ngIf="!isEstimating">Estimer le prix de la course</span>
        <span *ngIf="isEstimating" class="spinner-border spinner-border-sm"></span>
      </button>

    </div>

    <!-- ESTIMATION COLUMN -->
    <div class="side-column">
      
      <!-- Prix Estimé -->
      <div class="card estimation-card p-4 animate__animated animate__fadeInRight" *ngIf="estimation">
        <h5 class="fw-bold mb-4 text-center">Récapitulatif de l'estimation</h5>
        
        <div class="estimation-details">
          <div class="detail-row">
            <span>Distance estimée</span>
            <span class="val">{{ estimation.distance }} km</span>
          </div>
          <div class="detail-row">
            <span>Durée estimée</span>
            <span class="val">{{ estimation.duration }} min</span>
          </div>
          <hr>
          <div class="detail-row">
            <span>Prix de base</span>
            <span>{{ estimation.base }} DT</span>
          </div>
          <div class="detail-row">
            <span>Supplément distance</span>
            <span>{{ estimation.distPrice }} DT</span>
          </div>
          <div class="detail-row" *ngIf="estimation.passengerExtra > 0">
            <span>Supplément passagers</span>
            <span>{{ estimation.passengerExtra }} DT</span>
          </div>
          <div class="detail-row" *ngIf="estimation.extrasSum > 0">
            <span>Options & Extras</span>
            <span>{{ estimation.extrasSum }} DT</span>
          </div>
          <div class="detail-row text-success fw-bold" *ngIf="estimation.reduction > 0">
            <span>Réduction collaboratif (-20%)</span>
            <span>-{{ estimation.reduction }} DT</span>
          </div>
        </div>

        <div class="total-box mt-4">
          <span class="total-label">TOTAL ESTIMÉ</span>
          <span class="total-value">{{ estimation.total }} DT</span>
        </div>

        <button class="btn-primary w-100 mt-4 py-3 shadow-lg" (click)="sendRequest()">
          Envoyer à tous les chauffeurs
        </button>
      </div>

      <!-- Chauffeurs Disponibles -->
      <div class="card p-4 mt-4 animate__animated animate__fadeInUp" *ngIf="estimation">
        <h5 class="fw-bold mb-4">Chauffeurs à proximité</h5>
        <div class="drivers-list">
          <div class="driver-mini-card" *ngFor="let d of availableDrivers">
            <div class="d-flex align-items-center">
              <app-profile-avatar [name]="d.name" [size]="40" [showStatus]="false"></app-profile-avatar>
              <div class="ms-3 flex-grow-1">
                <div class="fw-bold">{{ d.name }}</div>
                <div class="small text-warning"><span class="ion-md-star"></span> {{ d.rating }} <span class="text-muted">({{ d.tripsCount }} courses)</span></div>
                <div class="x-small text-muted">{{ d.vehicle }}</div>
              </div>
              <div class="text-end">
                <div class="fw-bold text-primary">{{ d.eta }}</div>
                <div class="x-small text-muted">{{ d.distance }}</div>
              </div>
            </div>
            <button class="btn-outline-primary btn-sm w-100 mt-3" (click)="sendRequest(d)">Demander ce chauffeur</button>
          </div>
        </div>
      </div>

      <!-- Placeholder if no estimation -->
      <div class="placeholder-card card p-5 text-center" *ngIf="!estimation">
        <span class="ion-md-calculator fs-1 text-muted mb-3 d-block"></span>
        <p class="text-muted mb-0">Remplissez le formulaire et estimez le prix pour voir les chauffeurs disponibles.</p>
      </div>

    </div>

  </div>

</div>
`,
  styleUrls: ['./request-ride.component.css']
})
export class RequestRideComponent implements OnInit {

  // Form Data
  form = {
    departure: '',
    destination: '',
    rideType: 'INDIVIDUAL',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    passengers: 1,
    paymentMethod: 'Carte bancaire',
    comment: '',
    bookingFor: 'SELF',
    riderName: '',
    riderPhone: ''
  };

  pickupMode: PickupMode = 'CUSTOM_ADDRESS';
  geoState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  geoError = '';
  currentCoords: { lat: number; lng: number } | null = null;
  private readonly cityCoordinates: Record<string, { lat: number; lng: number }> = {
    tunis: { lat: 36.8065, lng: 10.1815 },
    ariana: { lat: 36.8625, lng: 10.1956 },
    bardo: { lat: 36.8092, lng: 10.1406 },
    lac: { lat: 36.8437, lng: 10.2666 },
    marsa: { lat: 36.8782, lng: 10.3247 },
    sousse: { lat: 35.8256, lng: 10.6369 },
    sfax: { lat: 34.7406, lng: 10.7603 },
    nabeul: { lat: 36.4513, lng: 10.7356 },
    bizerte: { lat: 37.2744, lng: 9.8739 },
    monastir: { lat: 35.7779, lng: 10.8262 },
    mahdia: { lat: 35.5047, lng: 11.0622 }
  };

  extras = [
    { id: 'baggage', label: 'Bagages', price: 3, icon: 'ion-md-briefcase' },
    { id: 'animal', label: 'Animal', price: 5, icon: 'ion-md-paw' },
    { id: 'child', label: 'Siège enfant', price: 4, icon: 'ion-md-contacts' },
    { id: 'stop', label: 'Arrêt supplémentaire', price: 6, icon: 'ion-md-git-branch' },
    { id: 'wait', label: 'Attente chauffeur', price: 5, icon: 'ion-md-time' },
    { id: 'comfort', label: 'Véhicule confort', price: 7, icon: 'ion-md-star' }
  ];

  selectedExtras: string[] = [];
  
  // Available Drivers
  availableDrivers: Driver[] = [
    { id: 'DRV-001', name: 'Ahmed Ben Ali', rating: 4.9, tripsCount: 320, vehicle: 'Peugeot 308', eta: '5 min', distance: '1.2 km' },
    { id: 'DRV-002', name: 'Mohamed Trabelsi', rating: 4.7, tripsCount: 210, vehicle: 'Skoda Octavia', eta: '8 min', distance: '2.4 km' },
    { id: 'DRV-003', name: 'Sami Mansouri', rating: 4.8, tripsCount: 180, vehicle: 'Hyundai i20', eta: '12 min', distance: '3.1 km' }
  ];

  // Estimation State
  estimation: any = null;
  isEstimating = false;
  errors: string[] = [];

  // Success State
  submittedRequest: RideRequest | null = null;
  lastRequest: RideRequest | null = null;

  constructor(
    private router: Router,
    private rideRequestService: RideRequestService
  ) {}

  ngOnInit(): void {
    // Load last request from backend
    this.rideRequestService.getMyRideRequests().subscribe({
      next: (requests) => {
        if (requests.length > 0) {
          this.lastRequest = requests[0];
        }
      },
      error: (err) => console.error('Error loading requests', err)
    });
  }

  toggleExtra(extraId: string): void {
    if (this.selectedExtras.includes(extraId)) {
      this.selectedExtras = this.selectedExtras.filter(id => id !== extraId);
    } else {
      this.selectedExtras.push(extraId);
    }
    if (this.estimation) this.calculateEstimation();
  }

  validateForm(): boolean {
    this.errors = [];
    if (!this.form.departure.trim()) this.errors.push('Le départ est obligatoire.');
    if (!this.form.destination.trim()) this.errors.push('La destination est obligatoire.');
    if (!this.form.rideType) this.errors.push('Le type de trajet est obligatoire.');
    if (this.form.passengers <= 0) this.errors.push('Le nombre de passagers doit être supérieur à 0.');
    if (this.form.bookingFor === 'OTHER' && !this.form.riderName.trim()) {
      this.errors.push('Le nom du passager est obligatoire si vous réservez pour quelqu\'un d\'autre.');
    }
    if (this.form.bookingFor === 'OTHER' && !this.form.riderPhone.trim()) {
      this.errors.push('Le téléphone du passager est obligatoire si vous réservez pour quelqu\'un d\'autre.');
    }
    if (this.pickupMode === 'CURRENT_LOCATION' && this.geoState !== 'ready') {
      this.errors.push('Activez la localisation pour utiliser votre position actuelle.');
    }
    return this.errors.length === 0;
  }

  estimatePrice(): void {
    if (!this.validateForm()) return;

    this.isEstimating = true;
    setTimeout(() => {
      this.calculateEstimation();
      this.isEstimating = false;
    }, 1000);
  }

  calculateEstimation(): void {
    const distance = this.computeEstimatedDistanceKm();
    const duration = Math.max(8, Math.round(distance * 2.2));
    const base = 8;
    const distPrice = distance * 1.2;
    const passengerExtra = Math.max(0, this.form.passengers - 1) * 2;
    
    let extrasSum = 0;
    this.selectedExtras.forEach(id => {
      const extra = this.extras.find(e => e.id === id);
      if (extra) extrasSum += extra.price;
    });

    let total = base + distPrice + passengerExtra + extrasSum;
    let reduction = 0;
    if (this.form.rideType === 'COLLABORATIVE') {
      reduction = total * 0.2;
      total = total - reduction;
    }

    this.estimation = {
      distance: Math.round(distance * 10) / 10,
      duration,
      base,
      distPrice: Math.round(distPrice * 10) / 10,
      passengerExtra,
      extrasSum,
      reduction: Math.round(reduction * 10) / 10,
      total: Math.round(total * 10) / 10
    };
  }

    sendRequest(driver?: Driver): void {
      if (!this.estimation) return;

      const contextualComment = this.buildContextualComment();
      const payload: any = {
        departure: this.form.departure,
        destination: this.form.destination,
        rideType: this.form.rideType,
        passengers: this.form.passengers,
        paymentMethod: this.form.paymentMethod,
        comment: contextualComment,
        estimatedPrice: this.estimation.total,
        status: 'PENDING'
      };

      if (driver) {
        // Handle mock vs real ID. For now just to satisfy types.
        payload.driverId = parseInt(driver.id.replace('DRV-', '')) || null;
      }

      this.rideRequestService.createRideRequest(payload).subscribe({
        next: (res) => {
          this.submittedRequest = res;
          this.lastRequest = res;
          // Emit a custom event to notify other components to refresh from backend
          window.dispatchEvent(new CustomEvent('rideRequestCreated', { detail: res }));
        },
        error: (err) => {
          console.error('Error creating ride request', err);
          this.errors = ['Une erreur est survenue lors de l\'envoi de la demande.'];
        }
      });
    }

  setPickupMode(mode: PickupMode): void {
    this.pickupMode = mode;
    if (mode === 'CURRENT_LOCATION' && this.geoState !== 'ready') {
      this.useCurrentLocation();
    }
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.geoState = 'error';
      this.geoError = 'La géolocalisation n\'est pas supportée sur cet appareil.';
      return;
    }

    this.geoState = 'loading';
    this.geoError = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        this.currentCoords = { lat, lng };
        this.form.departure = `Ma position actuelle (${lat}, ${lng})`;
        this.geoState = 'ready';
      },
      () => {
        this.geoState = 'error';
        this.geoError = 'Impossible d\'accéder à votre position. Vérifiez les permissions du navigateur.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private computeEstimatedDistanceKm(): number {
    const destinationCoords = this.extractCoordsFromText(this.form.destination);
    const departureCoords = this.pickupMode === 'CURRENT_LOCATION' ? this.currentCoords : this.extractCoordsFromText(this.form.departure);

    if (departureCoords && destinationCoords) {
      return Math.max(1.5, this.haversineDistanceKm(departureCoords, destinationCoords));
    }

    const depText = this.form.departure.trim().toLowerCase();
    const destText = this.form.destination.trim().toLowerCase();
    const signal = Math.abs(depText.length - destText.length) + depText.split(' ').length + destText.split(' ').length;
    return Math.max(3, Math.min(35, 4 + signal * 0.9));
  }

  private extractCoordsFromText(value: string): { lat: number; lng: number } | null {
    if (!value) return null;
    const trimmed = value.trim();
    const coordMatch = trimmed.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lng = Number(coordMatch[3]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    const normalized = trimmed.toLowerCase();
    const cityKey = Object.keys(this.cityCoordinates).find(key => normalized.includes(key));
    return cityKey ? this.cityCoordinates[cityKey] : null;
  }

  private haversineDistanceKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadius = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private buildContextualComment(): string {
    const parts: string[] = [];
    if (this.form.comment?.trim()) {
      parts.push(this.form.comment.trim());
    }
    if (this.pickupMode === 'CURRENT_LOCATION') {
      parts.push('Point de départ: position GPS utilisateur');
    } else {
      parts.push('Point de départ: adresse personnalisée');
    }
    if (this.form.bookingFor === 'OTHER') {
      parts.push(`Passager à récupérer: ${this.form.riderName.trim()} (${this.form.riderPhone.trim()})`);
    }
    return parts.join(' | ');
  }

  resetForm(): void {
    this.submittedRequest = null;
    this.estimation = null;
    this.selectedExtras = [];
    this.form = {
      departure: '',
      destination: '',
      rideType: 'INDIVIDUAL',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      passengers: 1,
      paymentMethod: 'Carte bancaire',
      comment: '',
      bookingFor: 'SELF',
      riderName: '',
      riderPhone: ''
    };
    this.pickupMode = 'CUSTOM_ADDRESS';
    this.geoState = 'idle';
    this.geoError = '';
    this.currentCoords = null;
  }

  goToReservations(): void { this.router.navigate(['/client/reservations']); }
  goToCurrentRide(): void { this.router.navigate(['/client/current-ride']); }
  goToDashboard(): void { this.router.navigate(['/client/dashboard']); }
}
