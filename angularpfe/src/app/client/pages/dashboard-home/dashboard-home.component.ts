import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileAvatarComponent } from '../../../header/profile-avatar/profile-avatar.component';
import { AuthService } from '../../../auth/auth.service';
import { HttpClient } from '@angular/common/http';

interface Ride {
  id?: string;
  driverName?: string;
  driverRating?: number;
  driverAvatar?: string;
  driverPhoto?: string;
  vehicle?: string;
  route?: string;
  status: 'NONE' | 'PENDING' | 'IN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
  eta?: string;
  price?: number;
  departure?: string;
  destination?: string;
  type?: 'INDIVIDUAL' | 'COLLABORATIVE';
  date?: string;
  time?: string;
  passengers?: number;
  extras?: string[];
  distance?: number;
  duration?: number;
}

interface Driver {
  id: string;
  name: string;
  rating: number;
  tripsCount: number;
  vehicle: string;
  eta: string;
  distance: string;
}

interface SharedRide {
  id: string;
  departure: string;
  destination: string;
  driverName: string;
  driverRating: number;
  date: string;
  time: string;
  seats: number;
  price: number;
  vehicle: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ProfileAvatarComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit {

  // Stats
  stats = {
    currentRide: 0,
    pendingRequests: 0,
    sharedBookings: 0,
    activeConversations: 0,
    pendingReviews: 0
  };

  // Sections Data
  currentRide: Ride | null = null;
  availableDrivers: Driver[] = [];
  sharedRides: SharedRide[] = [];
  notifications: any[] = [];
  payments: any[] = [];
  conversations: any[] = [];

  // Quick Request Form
  quickRequest: Ride = {
    departure: '',
    destination: '',
    type: 'INDIVIDUAL',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    passengers: 1,
    extras: [],
    status: 'NONE'
  };

  estimation: { distance: number, duration: number, base: number, extras: number, total: number } | null = null;
  isEstimating = false;
  requestSuccess = false;

  // Modals
  showDetailsModal = false;
  showRequestModal = false;
  selectedDriverForRequest: Driver | null = null;
  
  pendingReviewRide: any = null;

  userName: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.getUserName();
    this.loadData();
    this.checkPendingReviews();
  }

  getUserName(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.firstName;
    }
  }

  loadData(): void {
    // Current Ride
    const storedRide = localStorage.getItem('client_current_ride');
    if (storedRide) {
      this.currentRide = JSON.parse(storedRide);
    } else {
      this.currentRide = null;
    }

    // Update Stats
    this.updateStats();
  }

  updateStats(): void {
    this.http.get<any>('http://localhost:8081/api/users/sidebar-counts').subscribe({
      next: (counts) => {
        if (!counts) return;
        this.stats.currentRide = counts.currentRide || 0;
        this.stats.pendingRequests = counts.trips || 0;
        this.stats.sharedBookings = counts.trips || 0;
        this.stats.activeConversations = counts.conversations || 0;
        this.stats.pendingReviews = counts.pendingReviews || 0;
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
      }
    });
  }

  // Estimation Logic
  estimatePrice(): void {
    if (!this.quickRequest.departure || !this.quickRequest.destination) {
      return;
    }

    this.isEstimating = true;
    setTimeout(() => {
      const distance = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
      const duration = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
      const base = 8;
      const distPrice = distance * 1.2;
      
      let extrasSum = 0;
      if (this.quickRequest.extras?.includes('baggage')) extrasSum += 3;
      if (this.quickRequest.extras?.includes('animal')) extrasSum += 5;
      if (this.quickRequest.extras?.includes('child')) extrasSum += 4;
      if (this.quickRequest.extras?.includes('stop')) extrasSum += 6;
      if (this.quickRequest.extras?.includes('wait')) extrasSum += 5;

      this.estimation = {
        distance,
        duration,
        base,
        extras: extrasSum,
        total: Math.round((base + distPrice + extrasSum) * 10) / 10
      };
      this.isEstimating = false;
    }, 800);
  }

  toggleExtra(extra: string): void {
    const extras = this.quickRequest.extras || [];
    if (extras.includes(extra)) {
      this.quickRequest.extras = extras.filter(e => e !== extra);
    } else {
      this.quickRequest.extras = [...extras, extra];
    }
    if (this.estimation) this.estimatePrice();
  }

  sendRequest(): void {
    if (!this.quickRequest.departure || !this.quickRequest.destination) return;

    const request = {
      ...this.quickRequest,
      id: 'REQ-' + Date.now(),
      status: 'PENDING',
      estimatedPrice: this.estimation?.total || 15
    };

    const requests = JSON.parse(localStorage.getItem('client_ride_requests') || '[]');
    requests.push(request);
    localStorage.setItem('client_ride_requests', JSON.stringify(requests));

    this.requestSuccess = true;
    this.updateStats();

    setTimeout(() => {
      this.requestSuccess = false;
      this.estimation = null;
      this.quickRequest = {
        departure: '',
        destination: '',
        type: 'INDIVIDUAL',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        passengers: 1,
        extras: [],
        status: 'NONE'
      };
      this.closeModal();
    }, 3000);
  }

  // Driver Request
  requestDriver(driver: Driver): void {
    this.selectedDriverForRequest = driver;
    this.quickRequest.departure = 'Ma position actuelle';
    this.showRequestModal = true;
    this.estimatePrice();
  }

  // Shared Ride
  bookSharedRide(ride: SharedRide): void {
    const bookings = JSON.parse(localStorage.getItem('client_shared_ride_bookings') || '[]');
    bookings.push({ ...ride, bookedAt: new Date().toISOString() });
    localStorage.setItem('client_shared_ride_bookings', JSON.stringify(bookings));
    
    this.reviewSuccessMessage = 'Réservation effectuée avec succès !';
    setTimeout(() => this.reviewSuccessMessage = null, 5000);
    this.updateStats();
  }

  reviewSuccessMessage: string | null = null;

  // Reviews
  openReviewModal(): void {
    if (this.pendingReviewRide) {
      this.router.navigate(['/client/reviews'], { queryParams: { rideId: this.pendingReviewRide.rideId } });
    } else {
      this.router.navigate(['/client/reviews']);
    }
  }

  loadDriverReviews(): any[] {
    return JSON.parse(localStorage.getItem('client_driver_reviews') || '[]');
  }

  hasReviewForRide(rideId: string): boolean {
    const reviews = this.loadDriverReviews();
    return reviews.some((r: any) => r.rideId === rideId);
  }

  checkPendingReviews(): void {
    // Check client_completed_rides
    let completedRides = JSON.parse(localStorage.getItem('client_completed_rides') || '[]');

    // Find all rides without a review
    const ridesToReview = completedRides.filter((r: any) => !this.hasReviewForRide(r.rideId));
    
    // First one for the dashboard card
    this.pendingReviewRide = ridesToReview.length > 0 ? ridesToReview[0] : null;
    
    // Update counter with total pending
    this.stats.pendingReviews = ridesToReview.length;
    
    this.updateStats();
  }

  // Helpers
  closeModal(): void {
    this.showDetailsModal = false;
    this.showRequestModal = false;
    this.selectedDriverForRequest = null;
  }

  cancelRide(): void {
    if (confirm('Voulez-vous vraiment annuler cette course ?')) {
      this.currentRide = null;
      localStorage.removeItem('client_current_ride');
      this.updateStats();
    }
  }

  // Navigation
  goToRequest(): void { this.router.navigate(['/client/request-ride']); }
  goToExplore(): void { this.router.navigate(['/client/available-rides']); }
  goToNotifications(): void { this.router.navigate(['/client/notifications']); }
  goToPayments(): void { this.router.navigate(['/client/payments']); }
  goToConversations(id?: string): void { 
    this.router.navigate(['/client/conversations'], id ? { queryParams: { driverId: id } } : {});
  }
  goToCurrentRide(): void { this.router.navigate(['/client/current-ride']); }

}
