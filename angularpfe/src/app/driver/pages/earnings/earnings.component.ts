import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { ChartConfiguration, Chart, registerables } from 'chart.js';
import { DriverService } from '../../services/driver.service';
import { Earning, EarningStats } from '../../models/driver.models';

Chart.register(...registerables);

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.css']
})
export class EarningsComponent implements OnInit, OnDestroy {
  earnings: Earning[] = [];
  stats: EarningStats | null = null;
  loading = true;
  selectedPeriod = 'week';
  
  // Filters & Search
  searchTerm = '';
  statusFilter = 'ALL';
  paymentFilter = 'ALL';
  sortBy = 'newest';

  // Modals
  showDetailsModal = false;
  showReceiptModal = false;
  selectedEarning: Earning | null = null;

  // Chart
  public chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false },
        ticks: { callback: (val: number) => val + ' DT' }
      },
      x: { grid: { display: false }, border: { display: false } }
    }
  };
  public chartType: any = 'bar';

  private searchSub?: Subscription;

  constructor(
    private driverService: DriverService,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
      }
    });
    this.loadData();
  }

  loadData(): void {
    this.driverService.getEarningStats().subscribe(stats => {
      this.stats = stats;
      this.chartData = {
        labels: stats.weeklyLabels,
        datasets: [{
          data: stats.weeklyData,
          label: 'Revenus (DT)',
          backgroundColor: '#3b82f6',
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 28,
        }]
      };
    });

    this.driverService.getEarnings().subscribe(earnings => {
      this.earnings = earnings;
      this.loading = false;
    });
  }

  get filteredEarnings(): Earning[] {
    let result = [...this.earnings];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(e => 
        e.passengerName.toLowerCase().includes(term) ||
        e.route.toLowerCase().includes(term) ||
        e.rideId.toLowerCase().includes(term) ||
        e.paymentMethod.toLowerCase().includes(term) ||
        e.status.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (this.statusFilter !== 'ALL') {
      result = result.filter(e => e.status === this.statusFilter);
    }

    // Payment Filter
    if (this.paymentFilter !== 'ALL') {
      result = result.filter(e => e.paymentMethod === this.paymentFilter.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'net_asc': return a.netAmount - b.netAmount;
        case 'net_desc': return b.netAmount - a.netAmount;
        case 'gross_asc': return a.grossAmount - b.grossAmount;
        case 'gross_desc': return b.grossAmount - a.grossAmount;
        default: return 0;
      }
    });

    return result;
  }

  get totalCommission(): number {
    return this.filteredEarnings.reduce((sum, e) => sum + e.commission, 0);
  }

  get totalTips(): number {
    return this.filteredEarnings.reduce((sum, e) => sum + e.tip, 0);
  }

  get totalNet(): number {
    return this.filteredEarnings.reduce((sum, e) => sum + e.netAmount, 0);
  }

  get totalGross(): number {
    return this.filteredEarnings.reduce((sum, e) => sum + e.grossAmount, 0);
  }

  // Modal Actions
  openDetails(earning: Earning): void {
    this.selectedEarning = earning;
    this.showDetailsModal = true;
  }

  openReceipt(earning: Earning): void {
    this.selectedEarning = earning;
    this.showReceiptModal = true;
  }

  closeModals(): void {
    this.showDetailsModal = false;
    this.showReceiptModal = false;
    this.selectedEarning = null;
  }

  printReceipt(): void {
    window.print();
  }
}
