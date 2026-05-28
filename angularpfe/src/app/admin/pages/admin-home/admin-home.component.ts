import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {
  stats: any = {};
  chartData: any[] = [];
  validations: any[] = [];
  activities: any[] = [];
  complaints: any[] = [];
  payments: any[] = [];

  // Growth Chart state
  growthError: boolean = false;
  growthLoading: boolean = false;
  isGrowthEmpty: boolean = false;

  selectedPeriod: string = '7 jours';
  
  // Modal state
  isModalOpen = false;
  modalTitle = '';
  modalData: any = null;
  modalType = '';
  modalLink = '';
  modalLinkText = '';
  constructor(private authService: AuthService, private http: HttpClient) {}
  ngOnInit(): void {
    this.initData();
  }

  initData(): void {
    this.stats = {
      totalUsers: 0,
      activePassengers: 0,
      activeDrivers: 0,
      activeOwners: 0,
      activeCompanies: 0,
      registeredVehicles: 0,
      revenue: 0,
      openReports: 0
    };
    this.validations = [];
    this.activities = [];
    this.complaints = [];
    this.payments = [];
    this.updateChartData('7 jours');

    // Load real statistics
    this.http.get<any>(`${environment.apiUrl}/admin/dashboard/stats`).subscribe({
      next: (data) => {
        if (data) this.stats = data;
      },
      error: (err) => console.error('Error loading admin dashboard stats:', err)
    });

    // Load validations (vehicles pending)
    this.http.get<any[]>(`${environment.apiUrl}/admin/validations`).subscribe({
      next: (data) => {
        this.validations = data || [];
      },
      error: (err) => console.error('Error loading validations:', err)
    });

    this.http.get<any[]>(`${environment.apiUrl}/admin/dashboard/recent-activity`).subscribe({
      next: (data) => {
        this.activities = data || [];
      },
      error: (err) => console.error('Error loading recent activity:', err)
    });

    this.http.get<any[]>(`${environment.apiUrl}/admin/complaints`).subscribe({
      next: (data) => {
        this.complaints = (data || []).slice(0, 4).map(c => this.mapComplaintForDashboard(c));
      },
      error: (err) => console.error('Error loading complaints:', err)
    });

    this.http.get<any[]>(`${environment.apiUrl}/admin/payments`).subscribe({
      next: (data) => {
        this.payments = (data || []).slice(0, 5).map(p => this.mapPaymentForDashboard(p));
      },
      error: (err) => console.error('Error loading payments:', err)
    });
  }

  private mapComplaintForDashboard(c: any): any {
    const priorityLabels: Record<string, string> = {
      HIGH: 'Haute',
      MEDIUM: 'Moyenne',
      LOW: 'Basse'
    };
    const statusLabels: Record<string, string> = {
      OPEN: 'Ouverte',
      IN_REVIEW: 'En cours',
      WAITING_RESPONSE: 'En attente',
      RESOLVED: 'Résolue',
      CLOSED: 'Clôturée'
    };
    return {
      ...c,
      type: c.title || c.category || 'Réclamation',
      user: c.complainantName || '—',
      priority: priorityLabels[c.priority] || c.priority,
      status: statusLabels[c.status] || c.status
    };
  }

  private mapPaymentForDashboard(p: any): any {
    const typeLabels: Record<string, string> = {
      PASSENGER_PAYMENT: 'Paiement passager',
      TENANT_PAYMENT: 'Paiement locataire',
      COMPANY_PAYMENT: 'Paiement entreprise',
      DRIVER_PAYOUT: 'Versement chauffeur',
      OWNER_PAYOUT: 'Versement propriétaire',
      GORIDE_COMMISSION: 'Commission GoRide',
      COMMISSION: 'Commission GoRide',
      REFUND: 'Remboursement',
      RENTAL: 'Location véhicule',
      TRIP: 'Course / covoiturage',
      RECHARGE: 'Recharge portefeuille'
    };
    const payer = p.user
      ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim()
      : '';
    return {
      ...p,
      type: p.title || typeLabels[p.type] || 'Transaction',
      date: this.formatActivityDate(p.createdAt),
      method: p.type === 'REFUND' ? 'Virement' : 'Carte bancaire',
      amount: p.amount,
      user: payer || 'Client GoRide',
      desc: payer ? `${payer} — ${p.amount} DT` : `${p.amount} DT`
    };
  }

  private formatActivityDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  onPeriodChange(event: any): void {
    this.selectedPeriod = event.target.value;
    this.updateChartData(this.selectedPeriod);
  }

  updateChartData(period: string): void {
    let apiPeriod = '7days';
    if (period === '30 derniers jours') apiPeriod = '30days';
    
    this.growthLoading = true;
    this.growthError = false;
    this.isGrowthEmpty = false;

    this.http.get<any[]>(`${environment.apiUrl}/admin/dashboard/growth?period=${apiPeriod}`).subscribe({
      next: (data) => {
        this.growthLoading = false;
        
        let growthData = data;
        // Check if the backend returned { data: [...] } instead of [...]
        if (data && (data as any).data) {
          growthData = (data as any).data;
        }

        if (!growthData || growthData.length === 0) {
          this.isGrowthEmpty = true;
          this.chartData = [];
          return;
        }

        // Find max value to calculate percentage heights
        let max = Math.max(...growthData.map((d: any) => d.value));
        if (max === 0) {
          this.isGrowthEmpty = true;
          this.chartData = [];
          return;
        }

        this.isGrowthEmpty = false;
        this.chartData = growthData.map((item: any) => ({
          label: item.label,
          value: item.value,
          height: `${(item.value / max) * 100}%`
        }));
      },
      error: (err) => {
        console.error('Error fetching growth data:', err);
        this.growthLoading = false;
        this.growthError = true;
        this.chartData = [];
      }
    });
  }

  retryGrowthData(): void {
    this.updateChartData(this.selectedPeriod);
  }

  formatNumber(value: any): string {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('fr-FR').replace(/,/g, ' ');
  }

  formatCurrency(value: number): string {
    return this.formatNumber(value) + ' DT';
  }

  openModal(type: string, data: any): void {
    this.modalType = type;
    this.modalData = data;
    
    if (type === 'validation') {
      this.modalTitle = 'Détails de la validation';
      this.modalLink = '/admin/validations';
      this.modalLinkText = 'Aller aux validations';
    } else if (type === 'activity') {
      this.modalTitle = 'Détails de l\'activité';
      this.modalLink = '';
    } else if (type === 'complaint') {
      this.modalTitle = 'Détails de la réclamation';
      this.modalLink = '/admin/complaints';
      this.modalLinkText = 'Aller aux réclamations';
    } else if (type === 'payment') {
      this.modalTitle = 'Détails du paiement';
      this.modalLink = '/admin/payments';
      this.modalLinkText = 'Aller aux paiements';
    }

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalData = null;
  }
}
