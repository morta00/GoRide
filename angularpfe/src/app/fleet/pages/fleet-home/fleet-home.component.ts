import { Component, OnInit } from '@angular/core';
import { VehicleService, FleetDashboardStats, RecentBooking, RecentActivity } from '../../../services/vehicle.service';

@Component({
  selector: 'app-fleet-home',
  templateUrl: './fleet-home.component.html',
  styleUrls: ['./fleet-home.component.css']
})
export class FleetHomeComponent implements OnInit {

  // ─── Stats ───────────────────────────────────────────────
  stats: FleetDashboardStats = {
    totalVehicles: 0, availableVehicles: 0,
    rentedVehicles: 0, maintenanceVehicles: 0,
    pendingBookings: 0, monthlyRevenue: 0,
    totalVehiclesTrend: 0, availableVehiclesTrend: 0,
    pendingBookingsTrend: 0, monthlyRevenueTrend: 0
  };
  isLoading = true;
  hasError = false;

  // ─── Recent Bookings ──────────────────────────────────────
  recentBookings: RecentBooking[] = [];
  bookingsLoading = true;
  bookingsError = false;

  // ─── Recent Activities ───────────────────────────────────
  recentActivities: RecentActivity[] = [];
  activitiesLoading = true;
  activitiesError = false;

  // Detail modal state
  selectedBooking: RecentBooking | null = null;

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentBookings();
    this.loadRecentActivities();
  }

  loadStats(): void {
    this.isLoading = true;
    this.hasError = false;
    this.vehicleService.getDashboardStats().subscribe({
      next: (data) => { this.stats = data; this.isLoading = false; },
      error: (err) => { console.error('[FleetHome] Stats error:', err); this.isLoading = false; this.hasError = true; }
    });
  }

  loadRecentBookings(): void {
    this.bookingsLoading = true;
    this.bookingsError = false;
    this.vehicleService.getRecentBookings().subscribe({
      next: (data) => { this.recentBookings = data; this.bookingsLoading = false; },
      error: (err) => { console.error('[FleetHome] Bookings error:', err); this.bookingsLoading = false; this.bookingsError = true; }
    });
  }

  loadRecentActivities(): void {
    this.activitiesLoading = true;
    this.activitiesError = false;
    this.vehicleService.getRecentActivities().subscribe({
      next: (data) => { this.recentActivities = data; this.activitiesLoading = false; },
      error: (err) => { console.error('[FleetHome] Activities error:', err); this.activitiesLoading = false; this.activitiesError = true; }
    });
  }

  accept(booking: RecentBooking): void {
    this.vehicleService.respondToBooking(booking.id, 'ACCEPTED').subscribe({
      next: () => { 
        booking.status = 'ACCEPTED'; 
        this.stats.pendingBookings = Math.max(0, this.stats.pendingBookings - 1);
        this.loadRecentActivities(); // Refresh activities
      },
      error: (err) => alert('Erreur lors de l\'acceptation : ' + err.error?.message)
    });
  }

  reject(booking: RecentBooking): void {
    if (!confirm('Refuser cette réservation ?')) return;
    this.vehicleService.respondToBooking(booking.id, 'REJECTED').subscribe({
      next: () => { 
        booking.status = 'REJECTED'; 
        this.stats.pendingBookings = Math.max(0, this.stats.pendingBookings - 1);
        this.loadRecentActivities(); // Refresh activities
      },
      error: (err) => alert('Erreur lors du refus : ' + err.error?.message)
    });
  }

  openDetail(booking: RecentBooking): void {
    this.selectedBooking = booking;
  }

  closeDetail(): void {
    this.selectedBooking = null;
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente', ACCEPTED: 'Acceptée',
      REJECTED: 'Refusée', CANCELLED: 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'badge-pending', ACCEPTED: 'badge-accepted',
      REJECTED: 'badge-rejected', CANCELLED: 'badge-cancelled'
    };
    return classes[status] || '';
  }

  formatTrend(value: number): string {
    if (value > 0) return `+${value.toFixed(0)}%`;
    if (value < 0) return `${value.toFixed(0)}%`;
    return '0%';
  }

  trendClass(value: number): string {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-danger';
    return 'text-muted';
  }

  trendIcon(value: number): string {
    if (value > 0) return 'ion-ios-trending-up';
    if (value < 0) return 'ion-ios-trending-down';
    return 'ion-ios-remove';
  }

  getActivityIcon(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('ajouté')) return 'ion-ios-add-circle';
    if (t.includes('reçue')) return 'ion-ios-mail';
    if (t.includes('acceptée')) return 'ion-ios-checkmark-circle';
    if (t.includes('refusée')) return 'ion-ios-close-circle';
    if (t.includes('négocié')) return 'ion-ios-cash';
    if (t.includes('supprimé')) return 'ion-ios-trash';
    return 'ion-ios-notifications';
  }

  getActivityColorClass(category: string): string {
    switch (category) {
      case 'success': return 'bg-green-soft text-green';
      case 'info': return 'bg-blue-soft text-blue';
      case 'warning': return 'bg-yellow-soft text-yellow';
      case 'danger': return 'bg-red-soft text-red';
      default: return 'bg-light text-muted';
    }
  }
}
