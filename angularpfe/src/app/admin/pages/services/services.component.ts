import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RideRequestService } from '../../../services/ride-request.service';

@Component({
  selector: 'app-admin-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  services: any[] = [];
  filteredServices: any[] = [];
  searchTerm: string = '';
  currentFilter: string = 'ALL';
  currentSort: string = 'NEWEST';
  isLoading: boolean = false;

  stats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    issues: 0,
    totalAmount: 0,
    pendingPayments: 0
  };

  selectedService: any = null;
  showDetailsModal: boolean = false;
  isTrackingModalOpen: boolean = false;
  trackingStep: number = 2;
  activeDropdownId: string | null = null;

  constructor(
    private router: Router,
    private rideRequestService: RideRequestService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.calculateStats();
    this.applyFilter('ALL');
  }

  loadData(): void {
    this.isLoading = true;
    
    // Load Real Rides from Backend
    this.rideRequestService.getAdminRideServices().subscribe({
      next: (realRides) => {
        this.services = realRides.map(r => ({
          id: 'RIDE-' + r.id,
          serviceType: 'PASSENGER_RIDE',
          requesterName: r.clientName || 'Client Inconnu',
          providerName: r.driverName || 'En attente',
          vehicleName: r.vehicleModel || 'En attente',
          departure: r.departure,
          destination: r.destination,
          city: r.clientPhone ? 'Contact dispo' : 'Inconnue',
          amount: r.estimatedPrice,
          serviceStatus: r.status,
          paymentStatus: r.status === 'COMPLETED' ? 'PAID' : 'PENDING',
          priority: 'Moyenne',
          createdAt: r.createdAt,
          hasComplaint: false
        }));
        
        this.calculateStats();
        this.applyFilter(this.currentFilter);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading backend rides', err);
        this.services = [];
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      total: this.services.length,
      pending: this.services.filter(s => s.serviceStatus === 'PENDING').length,
      inProgress: this.services.filter(s => s.serviceStatus === 'IN_PROGRESS' || s.serviceStatus === 'ACCEPTED').length,
      completed: this.services.filter(s => s.serviceStatus === 'COMPLETED').length,
      cancelled: this.services.filter(s => s.serviceStatus === 'CANCELLED' || s.serviceStatus === 'REJECTED').length,
      issues: this.services.filter(s => s.serviceStatus === 'ISSUE' || s.hasComplaint).length,
      totalAmount: this.services.reduce((acc, s) => acc + (s.paymentStatus === 'PAID' ? s.amount : 0), 0),
      pendingPayments: this.services.filter(s => s.paymentStatus === 'UNPAID').length
    };
  }

  onSearch(): void {
    this.applyFilter(this.currentFilter);
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;
    let filtered = [...this.services];
    if (filter === 'PASSENGER') filtered = filtered.filter(s => s.serviceType === 'PASSENGER_RIDE');
    else if (filter === 'SHARED') filtered = filtered.filter(s => s.serviceType === 'SHARED_TRIP');
    else if (filter === 'RENTAL') filtered = filtered.filter(s => s.serviceType.includes('RENTAL'));
    else if (filter === 'COMPANY') filtered = filtered.filter(s => s.serviceType.includes('COMPANY'));
    else if (filter === 'ISSUES') filtered = filtered.filter(s => s.serviceStatus === 'ISSUE' || s.hasComplaint);

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.requesterName?.toLowerCase().includes(term) || s.id?.toLowerCase().includes(term));
    }
    this.filteredServices = filtered;
  }

  getServiceLabel(type: string): string {
    const labels: any = {
      'PASSENGER_RIDE': 'Course passager',
      'SHARED_TRIP': 'Trajet collaboratif',
      'VEHICLE_RENTAL': 'Location véhicule',
      'COMPANY_VEHICLE_RENTAL': 'Location entreprise',
      'COMPANY_DRIVER_SERVICE': 'Chauffeur avec voiture',
      'COMPANY_MIXED_SERVICE': 'Service entreprise mixte',
      'DRIVER_MISSION': 'Mission chauffeur'
    };
    return labels[type] || 'Service';
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'PENDING': 'En attente',
      'ACCEPTED': 'Accepté',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminé',
      'REJECTED': 'Refusé',
      'CANCELLED': 'Annulé',
      'ISSUE': 'Problème signalé'
    };
    return labels[status] || 'Non renseigné';
  }

  getPaymentLabel(status: string): string {
    const labels: any = { 'PAID': 'Payé', 'UNPAID': 'Non payé', 'REFUNDED': 'Remboursé', 'PENDING': 'En attente' };
    return labels[status] || 'Non renseigné';
  }

  getServiceTitle(type: string): string {
    const labels: any = {
      'PASSENGER_RIDE': 'Détails course passager',
      'SHARED_TRIP': 'Détails trajet collaboratif',
      'VEHICLE_RENTAL': 'Détails location véhicule',
      'COMPANY_VEHICLE_RENTAL': 'Détails location entreprise',
      'COMPANY_DRIVER_SERVICE': 'Détails chauffeur avec voiture',
      'COMPANY_MIXED_SERVICE': 'Détails service entreprise mixte',
      'DRIVER_MISSION': 'Détails mission chauffeur'
    };
    return labels[type] || 'Détails du service';
  }

  getStatusClass(status: string): string {
    if (status === 'COMPLETED') return 'bg-success-soft text-success';
    if (status === 'PENDING') return 'bg-warning-soft text-warning';
    if (status === 'IN_PROGRESS' || status === 'ACCEPTED') return 'bg-primary-soft text-primary';
    if (status === 'CANCELLED' || status === 'REJECTED' || status === 'ISSUE') return 'bg-danger-soft text-danger';
    return 'bg-light text-muted';
  }

  openServiceDetails(service: any): void {
    console.log('Opening details for:', service);
    this.selectedService = { ...service };
    this.showDetailsModal = true;
  }

  closeServiceDetails(): void {
    this.showDetailsModal = false;
    this.selectedService = null;
  }

  toggleDropdown(id: string, event: Event): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  closeDropdowns(): void {
    this.activeDropdownId = null;
  }

  openTracking(service: any): void {
    this.selectedService = { ...service };
    this.isTrackingModalOpen = true;
  }

  closeTracking(): void {
    this.isTrackingModalOpen = false;
    this.selectedService = null;
  }

  goToSupport(id: string): void { this.router.navigate(['/admin/support'], { queryParams: { serviceId: id } }); }
  goToPayments(id: string): void { this.router.navigate(['/admin/payments'], { queryParams: { serviceId: id } }); }
  goToInvoice(id: string): void { this.router.navigate(['/admin/payments'], { queryParams: { tab: 'invoices', serviceId: id } }); }
  goToComplaint(id: string): void { this.router.navigate(['/admin/complaints'], { queryParams: { serviceId: id } }); }
}
