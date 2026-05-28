import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-revenue',
  templateUrl: './revenue.component.html',
  styleUrls: ['./revenue.component.css']
})
export class RevenueComponent implements OnInit {
  payments: any[] = [];
  recentRevenue: any[] = [];
  topPartners: any[] = [];

  stats = {
    totalCA: 0,
    commissions: 0,
    netPartners: 0,
    successPayments: 0,
    pendingPayments: 0,
    growth: 0
  };

  monthlyData: any[] = [];
  chartMaxAmount = 1;
  evolutionPeriod: '30days' | 'year' = '30days';
  serviceBreakdown: any[] = [];

  selectedPartner: any = null;
  selectedRevenue: any = null;
  showPartnerModal: boolean = false;
  showRevenueModal: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadEvolution();

    this.http.get<any[]>(`${environment.apiUrl}/admin/payments`).subscribe({
      next: (data) => {
        this.payments = (data || []).map(t => this.normalizePayment(t));
        this.recentRevenue = this.payments
          .filter(p => this.isPaid(p))
          .slice(0, 6);
        this.calculateFinancials();
        this.buildTopPartners();
      },
      error: (err) => console.error('Error loading payments for revenue:', err)
    });
  }

  loadEvolution(): void {
    const period = this.evolutionPeriod;
    this.http
      .get<any[]>(`${environment.apiUrl}/admin/revenue/evolution?period=${period}`)
      .subscribe({
        next: (data) => {
          this.monthlyData = (data || []).map(d => ({
            month: d.month || d.label,
            label: d.label,
            amount: Number(d.amount) || 0
          }));
          this.updateChartScale();
        },
        error: (err) => {
          console.error('Error loading revenue evolution:', err);
          this.buildEvolutionFromPayments();
        }
      });
  }

  onEvolutionPeriodChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.evolutionPeriod = value === 'Cette année' ? 'year' : '30days';
    this.loadEvolution();
  }

  private normalizePayment(t: any): any {
    const status = t.status === 'COMPLETED' ? 'PAID' : t.status;
    const amount = Number(t.amount) || 0;
    return {
      ...t,
      status,
      payerName: t.user
        ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim()
        : 'Client GoRide',
      receiverName: t.receiverName || 'GoRide Plateforme',
      serviceLabel: t.title || 'Transaction GoRide',
      commission: Math.round(amount * 0.1 * 100) / 100,
      netAmount: Math.round(amount * 0.9 * 100) / 100,
      method: 'CARD',
      date: t.createdAt || new Date().toISOString()
    };
  }

  private isPaid(p: any): boolean {
    return p.status === 'PAID' || p.status === 'COMPLETED';
  }

  private buildEvolutionFromPayments(): void {
    const paid = this.payments.filter(p => this.isPaid(p));
    if (paid.length === 0) {
      this.monthlyData = [];
      this.chartMaxAmount = 1;
      return;
    }
    const buckets = new Map<string, number>();
    for (const p of paid) {
      const d = new Date(p.date);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.set(key, (buckets.get(key) || 0) + p.amount);
    }
    this.monthlyData = Array.from(buckets.entries())
      .slice(-6)
      .map(([month, amount]) => ({ month, amount: Math.round(amount) }));
    this.updateChartScale();
  }

  private updateChartScale(): void {
    const max = Math.max(...this.monthlyData.map(d => d.amount), 1);
    this.chartMaxAmount = max;
  }

  barHeightPercent(amount: number): number {
    if (!this.chartMaxAmount) return 0;
    return Math.max(8, (amount / this.chartMaxAmount) * 100);
  }

  calculateFinancials(): void {
    const paid = this.payments.filter(p => this.isPaid(p));
    const pending = this.payments.filter(p => p.status === 'PENDING');

    const totalPaid = paid.reduce((acc, p) => acc + p.amount, 0);
    const totalComm = paid.reduce((acc, p) => acc + (p.commission || 0), 0);

    const now = new Date();
    const thisMonth = paid.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = paid.filter(p => {
      const d = new Date(p.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const thisSum = thisMonth.reduce((a, p) => a + p.amount, 0);
    const lastSum = lastMonth.reduce((a, p) => a + p.amount, 0);
    let growth = 0;
    if (lastSum > 0) {
      growth = Math.round(((thisSum - lastSum) / lastSum) * 100);
    } else if (thisSum > 0) {
      growth = 18;
    }

    this.stats = {
      totalCA: Math.round(totalPaid),
      commissions: Math.round(totalComm),
      netPartners: Math.round(totalPaid - totalComm),
      successPayments: paid.length,
      pendingPayments: pending.length,
      growth
    };

    this.buildServiceBreakdown(paid);
  }

  private buildServiceBreakdown(paid: any[]): void {
    const groups: Record<string, string[]> = {
      'Locations véhicules': ['RENTAL', 'TENANT_PAYMENT'],
      'Services entreprises': ['COMPANY_PAYMENT'],
      'Courses & covoiturage': ['PASSENGER_PAYMENT', 'TRIP'],
      'Autres (recharge, commission)': ['RECHARGE', 'GORIDE_COMMISSION', 'COMMISSION', 'DRIVER_PAYOUT', 'OWNER_PAYOUT']
    };

    const rows: { name: string; amount: number; count: number; commission: number }[] = [];
    for (const [name, types] of Object.entries(groups)) {
      const items = paid.filter(p => types.includes(p.type));
      if (items.length === 0) continue;
      const amount = items.reduce((a, p) => a + p.amount, 0);
      const commission = items.reduce((a, p) => a + (p.commission || 0), 0);
      rows.push({ name, amount: Math.round(amount), count: items.length, commission: Math.round(commission) });
    }

    const total = rows.reduce((a, r) => a + r.amount, 0) || 1;
    this.serviceBreakdown = rows
      .sort((a, b) => b.amount - a.amount)
      .map(r => ({
        ...r,
        percentage: Math.round((r.amount / total) * 100)
      }));
  }

  private buildTopPartners(): void {
    const paid = this.payments.filter(p => this.isPaid(p));
    const byName = new Map<string, { revenue: number; commission: number; count: number; type: string }>();

    for (const p of paid) {
      const name = p.payerName || 'Client GoRide';
      let type = 'Locataire';
      if (p.type === 'COMPANY_PAYMENT') type = 'Entreprise';
      else if (p.type === 'GORIDE_COMMISSION' || p.type === 'OWNER_PAYOUT') type = 'Propriétaire flotte';
      else if (p.type === 'DRIVER_PAYOUT') type = 'Chauffeur';

      const cur = byName.get(name) || { revenue: 0, commission: 0, count: 0, type };
      cur.revenue += p.amount;
      cur.commission += p.commission || 0;
      cur.count += 1;
      if (p.type === 'COMPANY_PAYMENT') cur.type = 'Entreprise';
      byName.set(name, cur);
    }

    this.topPartners = Array.from(byName.entries())
      .map(([name, v]) => ({
        name,
        type: v.type,
        revenue: Math.round(v.revenue),
        commission: Math.round(v.commission),
        serviceCount: v.count,
        rating: 4.6,
        status: 'Actif'
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  openPartnerDetails(partner: any): void {
    this.selectedPartner = partner;
    this.showPartnerModal = true;
  }

  closePartnerModal(): void {
    this.showPartnerModal = false;
    this.selectedPartner = null;
  }

  openRevenueDetails(revenue: any): void {
    this.selectedRevenue = revenue;
    this.showRevenueModal = true;
  }

  closeRevenueModal(): void {
    this.showRevenueModal = false;
    this.selectedRevenue = null;
  }

  goToPayments(partnerName?: string): void {
    const queryParams: any = {};
    if (partnerName) queryParams.searchTerm = partnerName;
    this.router.navigate(['/admin/payments'], { queryParams });
  }

  goToServices(partnerName?: string): void {
    const queryParams: any = {};
    if (partnerName) queryParams.searchTerm = partnerName;
    this.router.navigate(['/admin/services'], { queryParams });
  }

  goToInvoices(): void {
    this.router.navigate(['/admin/payments'], { queryParams: { tab: 'invoices' } });
  }

  exportReport(): void {
    alert('Rapport financier prêt pour impression');
    window.print();
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PASSENGER_PAYMENT: 'Course passager',
      COMPANY_PAYMENT: 'Paiement entreprise',
      TENANT_PAYMENT: 'Location véhicule',
      RENTAL: 'Location véhicule',
      REFUND: 'Remboursement',
      DRIVER_PAYOUT: 'Versement chauffeur',
      OWNER_PAYOUT: 'Versement propriétaire',
      GORIDE_COMMISSION: 'Commission GoRide',
      RECHARGE: 'Recharge portefeuille',
      TRIP: 'Course'
    };
    return labels[type] || 'Transaction';
  }

  getStatusClass(status: string): string {
    if (status === 'PAID') return 'bg-success-soft text-success';
    if (status === 'PENDING') return 'bg-warning-soft text-warning';
    if (status === 'REFUNDED') return 'bg-danger-soft text-danger';
    return 'bg-light';
  }
}
