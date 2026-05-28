import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { RideRequestService, RideRequest } from '../../../services/ride-request.service';
import { ProfileAvatarComponent } from '../../../header/profile-avatar/profile-avatar.component';
import * as L from 'leaflet';

type LatLng = [number, number];

const TN_CITIES: Record<string, LatLng> = {
  tunis: [36.8065, 10.1815],
  sfax: [34.7406, 10.7603],
  sousse: [35.8256, 10.6084],
  monastir: [35.7643, 10.8113],
  bizerte: [37.2744, 9.8739],
  gabes: [33.8815, 10.0982],
  kairouan: [35.6781, 10.0963],
  'lac 2': [36.836, 10.241],
  'la marsa': [36.878, 10.325]
};

@Component({
  selector: 'app-current-ride',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileAvatarComponent],
  templateUrl: './current-ride.component.html',
  styleUrls: ['./current-ride.component.css']
})
export class CurrentRideComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('rideMap') rideMapRef?: ElementRef<HTMLDivElement>;

  activeRide: RideRequest | null = null;
  isLoading = true;
  showPhoneModal = false;
  mapLoading = false;
  actionLoading = false;

  routeDistanceKm = 0;
  routeDurationMin = 0;
  /** Minutes until driver reaches you (pickup) or destination (in progress). */
  etaMinutes = 0;
  pickupDistanceKm = 0;
  progressPercent = 0;
  /** Position GPS réelle du passager (navigateur). */
  myLocationActive = false;
  myLocationUnavailable = false;
  /** True when the blue route starts from live GPS (not the typed address). */
  routeFromGps = false;

  private pollInterval?: ReturnType<typeof setInterval>;
  private geoWatchId?: number;
  private animInterval?: ReturnType<typeof setInterval>;
  private etaInterval?: ReturnType<typeof setInterval>;
  private map?: L.Map;
  private routeLine?: L.Polyline;
  private driverMarker?: L.Marker;
  private pickupMarker?: L.Marker;
  private dropoffMarker?: L.Marker;
  private myLocationMarker?: L.Marker;
  private destinationCoords?: LatLng;
  private gpsRouteBuilt = false;
  private gpsFallbackTimer?: ReturnType<typeof setTimeout>;
  private routeCoords: LatLng[] = [];
  /** Passenger pickup point (GPS or address). */
  private passengerCoords?: LatLng;
  /** Simulated driver position while coming to pick you up. */
  private pickupRouteCoords: LatLng[] = [];
  private pickupDurationMin = 0;
  private mapInitPending = false;
  private lastMapKey = '';

  constructor(
    private router: Router,
    private rideRequestService: RideRequestService
  ) {}

  ngOnInit(): void {
    this.checkActiveRequest();
    this.pollInterval = setInterval(() => this.checkActiveRequest(), 3000);
  }

  ngAfterViewChecked(): void {
    if (this.mapInitPending && this.rideMapRef && this.activeRide?.status !== 'PENDING') {
      this.mapInitPending = false;
      setTimeout(() => this.initMap(), 50);
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.animInterval) clearInterval(this.animInterval);
    if (this.etaInterval) clearInterval(this.etaInterval);
    this.stopMyLocationTracking();
    this.destroyMap();
  }

  get driverPhone(): string {
    return this.activeRide?.driverPhone?.trim() || '+216 22 123 456';
  }

  get statusLabel(): string {
    const s = this.activeRide?.status;
    if (s === 'ACCEPTED' || s === 'DRIVER_ARRIVING') {
      const dist = this.pickupDistanceKm > 0
        ? ` · ${Math.round(this.pickupDistanceKm)} km`
        : '';
      return `Chauffeur arrive dans ${this.etaMinutes} min${dist}`;
    }
    if (s === 'IN_PROGRESS') {
      return `Course en cours · ~${this.etaMinutes} min restantes`;
    }
    if (s === 'COMPLETED') return 'Trajet terminé';
    return 'Suivi en cours';
  }

  get etaStatLabel(): string {
    const s = this.activeRide?.status;
    return s === 'IN_PROGRESS' ? 'Arrivée dest.' : 'Prise en charge';
  }

  get statusBadgeClass(): string {
    const s = this.activeRide?.status;
    if (s === 'IN_PROGRESS') return 'bg-success';
    if (s === 'COMPLETED') return 'bg-dark';
    return 'bg-primary';
  }

  checkActiveRequest(): void {
    this.rideRequestService.getMyCurrentRide().subscribe({
      next: (ride) => {
        const prevStatus = this.activeRide?.status;
        this.activeRide = ride;
        this.isLoading = false;
        if (ride && ride.status !== 'PENDING') {
          const key = `${ride.id}-${ride.status}-${ride.departure}-${ride.destination}`;
          if (key !== this.lastMapKey) {
            this.lastMapKey = key;
            this.mapInitPending = true;
          }
          this.updateProgressFromStatus();
          if (prevStatus !== ride.status) {
            this.refreshDriverOnMap();
          }
        } else {
          this.destroyMap();
        }
      },
      error: (err) => {
        if (err?.status === 204 || err?.status === 404) {
          this.activeRide = null;
          this.destroyMap();
        } else {
          console.error('Error fetching current ride', err);
        }
        this.isLoading = false;
      }
    });
  }

  private updateProgressFromStatus(): void {
    const s = this.activeRide?.status;
    if (s === 'COMPLETED') {
      this.progressPercent = 100;
      this.etaMinutes = 0;
      return;
    }
    if (s === 'IN_PROGRESS') {
      this.stopAnimations();
      if (!this.animInterval) this.startInProgressAnimation();
    } else if (s === 'ACCEPTED' || s === 'DRIVER_ARRIVING') {
      this.stopAnimations();
      if (this.pickupRouteCoords.length >= 2) {
        if (!this.animInterval) this.startPickupAnimation();
      } else if (this.passengerCoords) {
        void this.setupDriverPickup(this.passengerCoords).then(() => {
          if (!this.animInterval) this.startPickupAnimation();
        });
      }
    }
  }

  private startPickupAnimation(): void {
    if (this.pickupRouteCoords.length < 2) return;
    let t = 0;
    this.progressPercent = 2;
    this.etaMinutes = Math.max(1, this.pickupDurationMin);
    this.placeDriverAtPickup(0);
    const step = 0.015;
    const intervalMs = Math.max(
      2000,
      Math.round((this.pickupDurationMin * 60 * 1000) / (0.92 / step))
    );
    this.animInterval = setInterval(() => {
      t = Math.min(t + step, 0.92);
      this.placeDriverAtPickup(t);
      this.progressPercent = Math.min(18, Math.round(t * 20));
      this.etaMinutes = Math.max(1, Math.round(this.pickupDurationMin * (1 - t)));
    }, intervalMs);
  }

  private startInProgressAnimation(): void {
    let t = 0.02;
    this.progressPercent = 20;
    this.etaMinutes = Math.max(1, Math.round(this.routeDurationMin * 0.9));
    this.placeDriverAt(t);
    this.animInterval = setInterval(() => {
      t = Math.min(t + 0.008, 0.92);
      this.progressPercent = Math.round(18 + t * 82);
      this.placeDriverAt(t);
      this.etaMinutes = Math.max(1, Math.round(this.routeDurationMin * (1 - t)));
    }, 2500);
  }

  private startEtaCountdown(initial: number): void {
    this.etaMinutes = initial;
    this.etaInterval = setInterval(() => {
      if (this.etaMinutes > 1) this.etaMinutes--;
    }, 45000);
  }

  private stopAnimations(): void {
    if (this.animInterval) { clearInterval(this.animInterval); this.animInterval = undefined; }
    if (this.etaInterval) { clearInterval(this.etaInterval); this.etaInterval = undefined; }
  }

  private async initMap(): Promise<void> {
    if (!this.activeRide || !this.rideMapRef) return;
    this.mapLoading = true;
    this.gpsRouteBuilt = false;
    this.routeFromGps = false;
    this.destinationCoords = await this.resolveCoords(this.activeRide.destination);
    this.ensureMapInstance();
    this.startMyLocationTracking();
    // Si le GPS est refusé / lent, repli sur l'adresse saisie comme départ
    if (this.gpsFallbackTimer) clearTimeout(this.gpsFallbackTimer);
    this.gpsFallbackTimer = setTimeout(() => {
      if (!this.gpsRouteBuilt) {
        void this.buildRouteFromAddress();
      }
    }, 8000);
    this.mapLoading = false;
  }

  private ensureMapInstance(): void {
    const el = this.rideMapRef!.nativeElement;
    if (!this.map) {
      this.map = L.map(el);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.map);
    } else {
      this.map.invalidateSize();
    }
  }

  private async resolveCoords(label: string): Promise<LatLng> {
    const key = label.trim().toLowerCase();
    if (TN_CITIES[key]) return TN_CITIES[key];
    for (const [city, coords] of Object.entries(TN_CITIES)) {
      if (key.includes(city) || city.includes(key)) return coords;
    }
    try {
      const q = encodeURIComponent(`${label}, Tunisia`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data?.[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch { /* fallback below */ }
    return TN_CITIES['tunis'];
  }

  private async buildRouteFromAddress(): Promise<void> {
    if (!this.activeRide || !this.destinationCoords || this.gpsRouteBuilt) return;
    const dep = await this.resolveCoords(this.activeRide.departure);
    await this.drawRoute(dep, this.destinationCoords, `Départ : ${this.activeRide.departure}`, false);
  }

  private async buildRouteFromGps(gps: LatLng): Promise<void> {
    if (!this.destinationCoords || this.gpsRouteBuilt) return;
    await this.drawRoute(gps, this.destinationCoords, 'Départ : votre position actuelle (GPS)', true);
  }

  private async drawRoute(from: LatLng, to: LatLng, departurePopup: string, fromGps: boolean): Promise<void> {
    if (!this.map) return;
    this.gpsRouteBuilt = true;
    this.routeFromGps = fromGps;
    if (this.gpsFallbackTimer) {
      clearTimeout(this.gpsFallbackTimer);
      this.gpsFallbackTimer = undefined;
    }

    this.routeCoords = [from, to];
    try {
      const [lat1, lng1] = from;
      const [lat2, lng2] = to;
      const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.routes?.[0]) {
        const route = data.routes[0];
        this.routeDistanceKm = route.distance / 1000;
        this.routeDurationMin = Math.max(1, Math.round(route.duration / 60));
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng);
        this.routeCoords = coords;
      } else {
        this.estimateStraightLine(from, to);
      }
    } catch {
      this.estimateStraightLine(from, to);
    }

    if (this.routeLine) this.routeLine.remove();
    this.routeLine = L.polyline(this.routeCoords, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(this.map);

    const pin = (cls: string, icon: string) =>
      L.divIcon({
        className: '',
        html: `<div class="marker-pin ${cls}"><i class="ion-md-${icon}"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

    if (this.pickupMarker) this.pickupMarker.remove();
    this.pickupMarker = undefined;
    if (this.dropoffMarker) this.dropoffMarker.remove();
    if (this.driverMarker) this.driverMarker.remove();

    // Départ = position GPS (marqueur vert) ou point gris si pas de GPS
    if (!fromGps) {
      this.pickupMarker = L.marker(from, { icon: pin('pickup-route', 'navigate') })
        .addTo(this.map)
        .bindPopup(departurePopup);
    }

    this.dropoffMarker = L.marker(to, { icon: pin('dropoff', 'pin') }).addTo(this.map)
      .bindPopup(`Arrivée : ${this.activeRide?.destination || ''}`);

    this.passengerCoords = from;
    if (this.driverMarker) this.driverMarker.remove();
    this.driverMarker = L.marker(from, { icon: pin('driver', 'car'), zIndexOffset: 1000 })
      .addTo(this.map)
      .bindPopup('Chauffeur (simulation)');

    void this.setupDriverPickup(from).then(() => {
      this.fitMapToAllMarkers();
      this.updateProgressFromStatus();
    });
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  /** Driver starts from booked departure city, drives to your real pickup (GPS). */
  private async setupDriverPickup(passenger: LatLng): Promise<void> {
    if (!this.map || !this.activeRide) return;
    this.passengerCoords = passenger;

    let driverStart = await this.resolveCoords(this.activeRide.departure);
    if (this.haversineKm(driverStart, passenger) < 3) {
      driverStart = this.offsetKm(passenger, 12, 200);
    }

    await this.buildPickupRoute(driverStart, passenger);

    const s = this.activeRide.status;
    if (s === 'ACCEPTED' || s === 'DRIVER_ARRIVING') {
      this.placeDriverAtPickup(0);
      this.etaMinutes = Math.max(1, this.pickupDurationMin);
    } else if (s === 'IN_PROGRESS') {
      this.placeDriverAt(0.02);
      this.etaMinutes = Math.max(1, Math.round(this.routeDurationMin * 0.9));
    }
  }

  private async buildPickupRoute(from: LatLng, to: LatLng): Promise<void> {
    this.pickupRouteCoords = [from, to];
    try {
      const [lat1, lng1] = from;
      const [lat2, lng2] = to;
      const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.routes?.[0]) {
        const route = data.routes[0];
        this.pickupDistanceKm = route.distance / 1000;
        this.pickupDurationMin = Math.max(2, Math.round(route.duration / 60));
        this.pickupRouteCoords = route.geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as LatLng
        );
        return;
      }
    } catch { /* straight-line fallback */ }
    this.pickupDistanceKm = this.haversineKm(from, to);
    this.pickupDurationMin = Math.max(3, Math.round(this.pickupDistanceKm * 1.4));
  }

  private placeDriverAtPickup(t: number): void {
    if (!this.driverMarker || this.pickupRouteCoords.length < 2) return;
    this.driverMarker.setLatLng(this.pointAlongRoute(this.pickupRouteCoords, t));
  }

  private fitMapToAllMarkers(): void {
    if (!this.map || !this.routeLine) return;
    let bounds = this.routeLine.getBounds();
    if (this.pickupRouteCoords.length >= 2) {
      bounds = bounds.extend(L.latLngBounds(this.pickupRouteCoords));
    }
    if (this.myLocationMarker) {
      bounds.extend(this.myLocationMarker.getLatLng());
    }
    this.map.fitBounds(bounds, { padding: [52, 52], maxZoom: 14 });
  }

  private haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  /** Move a point by `km` along bearing (degrees, 0 = north). */
  private offsetKm(origin: LatLng, km: number, bearingDeg: number): LatLng {
    const R = 6371;
    const br = bearingDeg * Math.PI / 180;
    const lat1 = origin[0] * Math.PI / 180;
    const lon1 = origin[1] * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(km / R) +
      Math.cos(lat1) * Math.sin(km / R) * Math.cos(br)
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(br) * Math.sin(km / R) * Math.cos(lat1),
      Math.cos(km / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
  }

  /** GPS réel du passager — gratuit via le navigateur. Le chauffeur reste simulé sur l'itinéraire. */
  private startMyLocationTracking(): void {
    if (!navigator.geolocation || this.geoWatchId != null) return;

    navigator.geolocation.getCurrentPosition(
      pos => this.applyMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { /* watchPosition may still work */ },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    this.geoWatchId = navigator.geolocation.watchPosition(
      pos => this.applyMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {
        this.myLocationUnavailable = true;
        this.myLocationActive = false;
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  }

  private stopMyLocationTracking(): void {
    if (this.geoWatchId != null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = undefined;
    }
    this.myLocationActive = false;
  }

  private applyMyLocation(pos: LatLng): void {
    if (!this.map) return;

    const icon = L.divIcon({
      className: '',
      html: '<div class="marker-pin me-live"><i class="ion-md-person"></i></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (this.myLocationMarker) {
      this.myLocationMarker.setLatLng(pos);
    } else {
      this.myLocationMarker = L.marker(pos, { icon, zIndexOffset: 3000 })
        .addTo(this.map)
        .bindPopup('Départ : votre position actuelle (GPS)');
    }

    this.myLocationActive = true;
    this.myLocationUnavailable = false;

    if (!this.gpsRouteBuilt && this.destinationCoords) {
      void this.buildRouteFromGps(pos);
    }
  }

  private estimateStraightLine(from: LatLng, to: LatLng): void {
    const R = 6371;
    const dLat = (to[0] - from[0]) * Math.PI / 180;
    const dLon = (to[1] - from[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(from[0] * Math.PI / 180) * Math.cos(to[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    this.routeDistanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    this.routeDurationMin = Math.max(5, Math.round(this.routeDistanceKm * 1.2));
  }

  private placeDriverAt(t: number): void {
    if (!this.driverMarker || this.routeCoords.length < 2) return;
    const pos = this.pointAlongRoute(this.routeCoords, t);
    this.driverMarker.setLatLng(pos);
  }

  private refreshDriverOnMap(): void {
    if (!this.activeRide) return;
    if (this.activeRide.status === 'COMPLETED') {
      this.placeDriverAt(1);
      this.stopAnimations();
    } else {
      this.updateProgressFromStatus();
    }
  }

  private pointAlongRoute(coords: LatLng[], t: number): LatLng {
    if (coords.length < 2) return coords[0];
    const total = coords.length - 1;
    const f = t * total;
    const i = Math.min(Math.floor(f), total - 1);
    const local = f - i;
    const a = coords[i];
    const b = coords[i + 1];
    return [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
  }

  private destroyMap(): void {
    this.stopAnimations();
    this.stopMyLocationTracking();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.routeLine = undefined;
    this.driverMarker = undefined;
    this.pickupMarker = undefined;
    this.dropoffMarker = undefined;
    this.myLocationMarker = undefined;
    this.destinationCoords = undefined;
    this.passengerCoords = undefined;
    this.pickupRouteCoords = [];
    this.pickupDistanceKm = 0;
    this.pickupDurationMin = 0;
    this.gpsRouteBuilt = false;
    this.routeFromGps = false;
    if (this.gpsFallbackTimer) {
      clearTimeout(this.gpsFallbackTimer);
      this.gpsFallbackTimer = undefined;
    }
    this.lastMapKey = '';
  }

  cancelRide(): void {
    if (!this.activeRide?.id) return;
    this.rideRequestService.cancelRideRequest(this.activeRide.id).subscribe({
      next: () => this.router.navigate(['/client/reservations']),
      error: (err) => console.error('Error cancelling ride', err)
    });
  }

  startRide(): void {
    if (!this.activeRide?.id) return;
    this.actionLoading = true;
    this.rideRequestService.startRideRequest(this.activeRide.id).subscribe({
      next: (ride) => {
        this.activeRide = ride;
        this.actionLoading = false;
        this.lastMapKey = '';
        this.mapInitPending = true;
        this.checkActiveRequest();
      },
      error: () => {
        this.actionLoading = false;
        if (this.activeRide) this.activeRide.status = 'IN_PROGRESS';
        this.updateProgressFromStatus();
      }
    });
  }

  completeRide(): void {
    if (!this.activeRide?.id) return;
    this.actionLoading = true;
    this.rideRequestService.completeRideRequest(this.activeRide.id).subscribe({
      next: (ride) => {
        this.activeRide = ride;
        this.actionLoading = false;
        this.progressPercent = 100;
        this.placeDriverAt(1);
        this.stopAnimations();
      },
      error: () => {
        this.actionLoading = false;
        if (this.activeRide) this.activeRide.status = 'COMPLETED';
        this.progressPercent = 100;
      }
    });
  }

  contactDriver(): void {
    if (this.activeRide?.driverId) {
      this.router.navigate(['/client/conversations'], {
        queryParams: { driverId: this.activeRide.driverId, rideId: this.activeRide.id }
      });
    } else {
      this.router.navigate(['/client/conversations'], { queryParams: { rideId: this.activeRide?.id } });
    }
  }

  leaveReview(): void {
    this.router.navigate(['/client/reviews'], { queryParams: { rideId: this.activeRide?.id } });
  }
}
