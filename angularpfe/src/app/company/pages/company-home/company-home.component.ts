import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-company-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-home.component.html',
  styleUrls: ['./company-home.component.css']
})
export class CompanyHomeComponent implements OnInit {
  stats = {
    pendingRequests: 0,
    acceptedServices: 0,
    ongoingMissions: 0,
    reservedVehicles: 0,
    reservedDrivers: 0,
    pendingInvoices: 0
  };

  recentRequests: any[] = [];
  ongoingMissions: any[] = [];
  confirmedReservations: any[] = [];
  pendingInvoices: any[] = [];
  recentNotifications: any[] = [];
  pendingReview: any = null;

  selectedRequest: any = null;
  showRequestModal = false;
  
  selectedReservation: any = null;
  showReservationModal = false;

  totalSpentMonth = 0;
  lastPayment: any = null;

  userName: string = 'Entreprise';

  constructor(
    private router: Router,
    private authService: AuthService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.firstName} ${user.lastName}`;
    }
    this.loadData();
  }

  loadData(): void {
    this.companyService.getDashboardData().subscribe({
      next: (data) => {
        if (data) {
          this.stats = {
            pendingRequests: data.pendingRequests || 0,
            acceptedServices: data.acceptedServices || 0,
            ongoingMissions: data.activeMissions || 0,
            reservedVehicles: data.reservedVehicles || 0,
            reservedDrivers: data.reservedDrivers || 0,
            pendingInvoices: data.unpaidInvoices || 0
          };

          this.recentRequests = (data.recentRequests || []).map((r: any) => this.normalizeRequest(r));
          this.ongoingMissions = (data.activeMissionsList || []).map((r: any) => this.normalizeRequest(r));
          this.confirmedReservations = (data.confirmedReservations || []).map((r: any) => this.normalizeReservation(r));
          this.recentNotifications = (data.notifications || []).map((n: any) => ({
            text: (n.message || n.text || n.title || '').replace(/\[GORIDE-CORP-DEMO\]\s*/g, '').trim(),
            date: n.createdAt ? this.formatNotificationDate(n.createdAt) : ''
          }));
          this.applyFallbackDataIfNeeded();

          // Payments
          this.companyService.getPayments().subscribe({
            next: (payData) => {
              if (payData && payData.summary) {
                this.totalSpentMonth = payData.summary.totalSpent || 0;
                this.pendingInvoices = (payData.invoices || []).filter((i: any) => i.status === 'PENDING').map((i: any) => ({
                  id: 'INV-' + i.id,
                  amount: i.amount
                }));
                if (payData.transactions && payData.transactions.length > 0) {
                  const last = payData.transactions[0];
                  this.lastPayment = {
                    title: last.description || 'Paiement',
                    amount: last.amount,
                    status: last.status
                  };
                } else {
                  this.lastPayment = this.buildFallbackLastPayment();
                }
              }
              this.applyFallbackDataIfNeeded();
            }
          });
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement du dashboard entreprise', err);
        this.applyFallbackDataIfNeeded(true);
      }
    });
  }

  normalizeRequest(r: any): any {
    const startDate = r.startDate ? new Date(r.startDate) : new Date();
    const endDate = r.endDate ? new Date(r.endDate) : new Date(Date.now() + 2 * 86400000);
    const vehicles = r.requestedQuantity || r.vehiclesCount || 1;
    const chauffeurs = r.driversCount || (r.type === 'DRIVER_WITH_CAR' ? 1 : 0);
    const amount = r.budget || r.pricePerDay || 0;
    return {
      id: r.id,
      title: r.type === 'VEHICLE_RENTAL' ? 'Location véhicule: ' + (r.vehicleName || 'SUV') : 
             r.type === 'DRIVER_WITH_CAR' ? 'Chauffeur avec voiture: ' + (r.driverName || 'Ahmed') : 'Demande mixte',
      type: r.type === 'VEHICLE_RENTAL' ? 'Location véhicules' : 
            r.type === 'DRIVER_WITH_CAR' ? 'Chauffeur avec voiture' : 'Demande personnalisée',
      city: r.city || 'Tunis',
      duration: r.startDate && r.endDate ? `${r.startDate} au ${r.endDate}` : 'Non spécifié',
      status: this.getStatusText(r.status),
      budget: amount,
      vehiclesCount: vehicles,
      driversCount: chauffeurs,
      vehicles,
      chauffeurs,
      startDate,
      endDate,
      amount
    };
  }

  normalizeReservation(r: any): any {
    return {
      id: r.id,
      vehicle: r.vehicleName || r.type || 'Réservation',
      provider: r.ownerName || r.driverName || 'Partenaire',
      duration: r.startDate && r.endDate ? `${r.startDate} au ${r.endDate}` : 'Non spécifié',
      status: r.status || 'Confirmée',
      amount: r.budget || r.pricePerDay || 0,
      date: r.createdAt
    };
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'PENDING_OWNER': return 'En attente propriétaire';
      case 'PENDING_DRIVER': return 'En attente chauffeur';
      case 'ACCEPTED': return 'Acceptée';
      case 'REJECTED': return 'Refusée';
      case 'CANCELLED': return 'Annulée';
      case 'CONFIRMED': return 'Confirmée';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminée';
      default: return status || 'Non précisé';
    }
  }

  openRequestDetails(request: any): void {
    this.selectedRequest = request;
    this.showRequestModal = true;
  }

  openReservationDetails(res: any): void {
    this.selectedReservation = res;
    this.showReservationModal = true;
  }

  closeModal(): void {
    this.selectedRequest = null;
    this.showRequestModal = false;
    this.selectedReservation = null;
    this.showReservationModal = false;
  }

  goTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  contactMission(mission: any): void {
    const queryParams: Record<string, string | number> = { requestId: mission.id };
    if (mission.driverId) {
      queryParams['driverId'] = mission.driverId;
      queryParams['context'] = 'COMPANY_DRIVER';
    } else if (mission.ownerId) {
      queryParams['ownerId'] = mission.ownerId;
      queryParams['context'] = 'COMPANY_OWNER';
    } else {
      queryParams['type'] = 'support';
    }
    this.router.navigate(['/company/conversations'], { queryParams });
  }

  private applyFallbackDataIfNeeded(force = false): void {
    const noMainData =
      this.recentRequests.length === 0 &&
      this.ongoingMissions.length === 0 &&
      this.confirmedReservations.length === 0;

    if (!force && !noMainData) {
      return;
    }

    this.recentRequests = [
      {
        id: 801,
        title: 'Transport équipe commerciale',
        type: 'Chauffeur avec voiture',
        city: 'Tunis',
        duration: '10/06/2026 au 14/06/2026',
        status: 'En attente chauffeur',
        budget: 780,
        vehiclesCount: 2,
        driversCount: 2,
        vehicles: 2,
        chauffeurs: 2,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-14'),
        amount: 780
      },
      {
        id: 802,
        title: 'Navette siège -> usine',
        type: 'Location véhicules',
        city: 'Ariana',
        duration: '12/06/2026 au 30/06/2026',
        status: 'Acceptée',
        budget: 1260,
        vehiclesCount: 3,
        driversCount: 1,
        vehicles: 3,
        chauffeurs: 1,
        startDate: new Date('2026-06-12'),
        endDate: new Date('2026-06-30'),
        amount: 1260
      }
    ];

    this.ongoingMissions = [
      {
        id: 910,
        title: 'Mission chantier Lac 2',
        vehicles: 2,
        chauffeurs: 2,
        startDate: new Date('2026-05-26'),
        endDate: new Date('2026-06-03'),
        amount: 920
      },
      {
        id: 911,
        title: 'Déplacements direction régionale',
        vehicles: 1,
        chauffeurs: 1,
        startDate: new Date('2026-05-28'),
        endDate: new Date('2026-06-07'),
        amount: 540
      }
    ];

    this.confirmedReservations = [
      {
        id: 701,
        vehicle: 'Toyota Corolla Business',
        provider: 'Fleet Tunis',
        duration: '08/06/2026 au 12/06/2026',
        status: 'Confirmée',
        amount: 640,
        date: new Date('2026-05-24')
      },
      {
        id: 702,
        vehicle: 'Driver Premium + Van',
        provider: 'Express Driver',
        duration: '15/06/2026 au 16/06/2026',
        status: 'Confirmée',
        amount: 390,
        date: new Date('2026-05-25')
      }
    ];

    if (this.recentNotifications.length === 0) {
      this.recentNotifications = [
        { text: 'Ahmed Abidi a validé 3 véhicules pour votre mission à Sfax.', date: "Aujourd'hui" },
        { text: 'FAC-2026-204 : acompte flotte été à régler avant le 05/06.', date: 'Hier' },
        { text: 'Chauffeur Imed Kilani confirmé pour la semaine prochaine.', date: 'Il y a 2 jours' }
      ];
    }

    this.pendingReview = {
      title: 'Évaluez votre dernière mission',
      desc: 'Votre mission "Transport équipe commerciale" est terminée. Votre avis aide à améliorer les prestataires.'
    };

    this.stats = {
      pendingRequests: this.stats.pendingRequests || 2,
      acceptedServices: this.stats.acceptedServices || 4,
      ongoingMissions: this.stats.ongoingMissions || this.ongoingMissions.length,
      reservedVehicles: this.stats.reservedVehicles || 5,
      reservedDrivers: this.stats.reservedDrivers || 3,
      pendingInvoices: this.stats.pendingInvoices || 1
    };

    this.totalSpentMonth = this.totalSpentMonth || 4580;
    this.pendingInvoices = this.pendingInvoices.length > 0 ? this.pendingInvoices : [{ id: 'INV-2451', amount: 1240 }];
    this.lastPayment = this.lastPayment || this.buildFallbackLastPayment();
  }

  private buildFallbackLastPayment(): any {
    return {
      title: 'Paiement flotte mensuel',
      amount: 890,
      status: 'PAID'
    };
  }

  private formatNotificationDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.getDate() === now.getDate()
      && d.getMonth() === now.getMonth()
      && d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return "Aujourd'hui";
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate()
      && d.getMonth() === yesterday.getMonth()
      && d.getFullYear() === yesterday.getFullYear()) {
      return 'Hier';
    }
    return d.toLocaleDateString('fr-FR');
  }
}
