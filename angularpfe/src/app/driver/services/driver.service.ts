import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, tap, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {
  DriverProfile, Vehicle, Ride, RideRequest, Earning,
  EarningStats, Review, RideStatus
} from '../models/driver.models';

/**
 * DriverService — Service central du module Chauffeur.
 *
 * Architecture :
 * - Utilise des BehaviorSubjects pour le state management réactif.
 * - Les méthodes retournent des Observable<T> pour simuler exactement
 *   le comportement d'un HttpClient.get/post/put.
 * - Pour brancher le vrai backend, il suffit de remplacer les `of(...)`
 *   par des `this.http.get<T>(...)` sans toucher aux composants.
 */
@Injectable({ providedIn: 'root' })
export class DriverService {
  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════

  private profileSubject = new BehaviorSubject<DriverProfile>(this.getMockProfile());
  readonly profile$ = this.profileSubject.asObservable();

  private readonly onlineStorageKey = 'goride_driver_online';

  private onlineSubject = new BehaviorSubject<boolean>(this.readStoredOnlineStatus());
  readonly isOnline$ = this.onlineSubject.asObservable();

  private ridesSubject = new BehaviorSubject<Ride[]>(this.getMockRides());
  readonly rides$ = this.ridesSubject.asObservable();

  private requestsSubject = new BehaviorSubject<RideRequest[]>(this.getMockRequests());
  readonly requests$ = this.requestsSubject.asObservable();

  // ═══════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════

  getProfile(): Observable<DriverProfile> {
    return this.profile$;
  }

  updateProfile(updates: Partial<DriverProfile>): Observable<DriverProfile> {
    const current = this.profileSubject.value;
    const updated = { ...current, ...updates };
    this.profileSubject.next(updated);
    return of(updated).pipe(delay(300));
  }

  // ═══════════════════════════════════════
  // AVAILABILITY
  // ═══════════════════════════════════════

  toggleOnlineStatus(): Observable<boolean> {
    const newStatus = !this.onlineSubject.value;
    this.setOnlineStatus(newStatus);
    return of(newStatus).pipe(delay(200));
  }

  setOnlineStatus(online: boolean): void {
    this.onlineSubject.next(online);
    localStorage.setItem(this.onlineStorageKey, String(online));
    const current = this.profileSubject.value;
    this.profileSubject.next({
      ...current,
      isOnline: online,
      availability: online ? 'Disponible' : 'Hors ligne'
    });
  }

  getOnlineStatus(): boolean {
    return this.onlineSubject.value;
  }

  private readStoredOnlineStatus(): boolean {
    const stored = localStorage.getItem(this.onlineStorageKey);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return true;
  }

  // ═══════════════════════════════════════
  // RIDES
  // ═══════════════════════════════════════

  getRides(): Observable<Ride[]> {
    return this.rides$;
  }

  getRidesByStatus(status: RideStatus): Observable<Ride[]> {
    const filtered = this.ridesSubject.value.filter(r => r.status === status);
    return of(filtered);
  }

  getTodayRides(): Observable<Ride[]> {
    // Simulate filtering today's rides
    const today = this.ridesSubject.value.filter(r =>
      r.date.includes("Aujourd'hui") || r.date.includes('30/04/2026')
    );
    return of(today);
  }

  // ═══════════════════════════════════════
  // REQUESTS (Demandes entrantes)
  // ═══════════════════════════════════════

  getRequests(): Observable<RideRequest[]> {
    return this.requests$;
  }

  acceptRequest(requestId: string): Observable<Ride> {
    const requests = this.requestsSubject.value;
    const request = requests.find(r => r.id === requestId);
    if (!request) throw new Error('Request not found');

    // Remove from requests
    this.requestsSubject.next(requests.filter(r => r.id !== requestId));

    // Create a new ride from the request
    const newRide: Ride = {
      id: 'GR-' + Math.floor(Math.random() * 10000),
      passengerName: request.passengerName,
      passengerAvatar: request.passengerAvatar,
      passengerPhone: '+216 55 123 456',
      passengerRating: request.passengerRating,
      from: request.from,
      to: request.to,
      distance: request.distance,
      duration: request.estimatedDuration,
      date: "Aujourd'hui",
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      amount: request.estimatedAmount,
      status: 'acceptee',
      paymentMethod: request.paymentMethod,
    };

    // Add to rides
    const rides = this.ridesSubject.value;
    this.ridesSubject.next([newRide, ...rides]);

    return of(newRide).pipe(delay(400));
  }

  declineRequest(requestId: string): Observable<boolean> {
    const requests = this.requestsSubject.value;
    this.requestsSubject.next(requests.filter(r => r.id !== requestId));
    return of(true).pipe(delay(300));
  }

  // ═══════════════════════════════════════
  // VEHICLE
  // ═══════════════════════════════════════

  getVehicle(): Observable<Vehicle | null> {
    return of(this.getMockVehicle()).pipe(delay(300));
  }

  updateVehicle(updates: Partial<Vehicle>): Observable<Vehicle> {
    const current = this.getMockVehicle();
    const updated = { ...current, ...updates };
    return of(updated).pipe(delay(400));
  }

  // ═══════════════════════════════════════
  // EARNINGS
  // ═══════════════════════════════════════

  private readonly EARNINGS_KEY = 'driver_earnings';

  getEarnings(): Observable<Earning[]> {
    return this.http.get<any>(`${environment.apiUrl}/driver/earnings`).pipe(
      map(res => res.earnings || [])
    );
  }

  getEarningStats(): Observable<EarningStats> {
    return this.http.get<any>(`${environment.apiUrl}/driver/earnings`).pipe(
      map(res => res.stats)
    );
  }

  createEarningFromCompletedRide(ride: Ride): Observable<Earning> {
    const commissionRate = 0.15;
    const grossAmount = ride.amount;
    const commission = grossAmount * commissionRate;
    const tip = Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0;
    const netAmount = grossAmount - commission + tip;

    const newEarning: Earning = {
      id: 'E-' + Math.floor(Math.random() * 100000),
      rideId: ride.id,
      date: new Date().toISOString(),
      passengerName: ride.passengerName,
      from: ride.from,
      to: ride.to,
      route: `${ride.from} → ${ride.to}`,
      grossAmount: grossAmount,
      commission: commission,
      netAmount: netAmount,
      paymentMethod: ride.paymentMethod as any,
      tip: tip,
      status: 'PAID'
    };

    const earnings = this.loadEarnings();
    const updated = [newEarning, ...earnings];
    this.saveEarnings(updated);

    return of(newEarning).pipe(delay(300));
  }

  private loadEarnings(): Earning[] {
    const stored = localStorage.getItem(this.EARNINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const mocks = this.getMockEarnings();
    this.saveEarnings(mocks);
    return mocks;
  }

  private saveEarnings(earnings: Earning[]): void {
    localStorage.setItem(this.EARNINGS_KEY, JSON.stringify(earnings));
  }

  private calculateStats(earnings: Earning[]): EarningStats {
    const now = new Date();
    const todayStr = now.toLocaleDateString('fr-FR');
    
    // Simple mock logic for week/month filtering
    const paidEarnings = earnings.filter(e => e.status === 'PAID');
    
    const todayEarnings = paidEarnings
      .filter(e => new Date(e.date).toLocaleDateString('fr-FR') === todayStr || e.date === "Aujourd'hui")
      .reduce((sum, e) => sum + e.netAmount, 0);

    const weekEarnings = paidEarnings
      .reduce((sum, e) => sum + e.netAmount, 0) * 0.4; // Mock 40% for week

    const monthEarnings = paidEarnings
      .reduce((sum, e) => sum + e.netAmount, 0);

    const totalRides = paidEarnings.length;
    const averagePerRide = totalRides > 0 ? monthEarnings / totalRides : 0;

    return {
      todayEarnings,
      weekEarnings,
      monthEarnings,
      todayRides: paidEarnings.filter(e => e.date === "Aujourd'hui").length,
      weekRides: Math.ceil(totalRides * 0.3),
      monthRides: totalRides,
      averagePerRide,
      weeklyData: [65, 59, 80, 81, 56, 120, 145],
      weeklyLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    };
  }

  // ═══════════════════════════════════════
  // REVIEWS
  // ═══════════════════════════════════════

  getReviews(): Observable<Review[]> {
    return of(this.getMockReviews()).pipe(delay(300));
  }

  // ═══════════════════════════════════════
  // DASHBOARD STATS (aggregated)
  // ═══════════════════════════════════════

  getDashboardStats(): Observable<{
    todayEarnings: number;
    todayRides: number;
    rating: number;
    pendingRequests: number;
    onlineHours: string;
  }> {
    return of({
      todayEarnings: 0,
      todayRides: 0,
      rating: 0,
      pendingRequests: 0,
      onlineHours: '0h'
    }).pipe(delay(200));
  }

  // ═══════════════════════════════════════
  // MOCK DATA — Replace with HttpClient calls
  // ═══════════════════════════════════════

  private getMockProfile(): DriverProfile {
    return {
      id: 0,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      avatar: 'assets/images/default-avatar.png',
      rating: 0,
      totalRides: 0,
      completedTrips: 0,
      memberSince: '',
      isOnline: false,
      licenseNumber: '',
      city: '',
      address: '',
      cin: '',
      role: 'Chauffeur',
      status: 'PENDING',
      mainZone: '',
      experienceYears: 0,
      licenseSince: 0,
      availability: 'Indisponible',
      acceptanceRate: 0,
      cancellationRate: 0,
      bio: ''
    };
  }

  private getMockVehicle(): Vehicle {
    return {
      id: 0,
      brand: '',
      model: '',
      year: 0,
      color: '',
      plateNumber: '',
      type: 'Berline',
      status: 'inactive',
      image: 'assets/images/car_placeholder.png',
      insuranceExpiry: '',
      technicalControlExpiry: '',
      fuelType: '',
      mileage: 0
    };
  }

  private getMockRides(): Ride[] {
    return [];
  }

  private getMockRequests(): RideRequest[] {
    return [];
  }

  private getMockEarnings(): Earning[] {
    return [];
  }

  private getMockEarningStats(): EarningStats {
    return {
      todayEarnings: 0,
      weekEarnings: 0,
      monthEarnings: 0,
      todayRides: 0,
      weekRides: 0,
      monthRides: 0,
      averagePerRide: 0,
      weeklyData: [0, 0, 0, 0, 0, 0, 0],
      weeklyLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    };
  }

  private getMockReviews(): Review[] {
    return [];
  }
}
