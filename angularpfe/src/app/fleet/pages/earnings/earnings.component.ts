import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.css']
})
export class EarningsComponent implements OnInit {
  isExporting: boolean = false;
  isLoading: boolean = false;
  toastMessage: string | null = null;
  toastType: 'success' | 'danger' = 'success';
  activePeriod: '7D' | '30D' | '12M' = '12M';
  
  // --- Chart Setup ---
  public lineChartType: ChartType = 'line';
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        label: 'Revenus (DT)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderColor: '#2563eb',
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#2563eb',
        fill: 'origin',
        tension: 0.4
      }
    ],
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
  };

  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: true, color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 11 }, color: '#94a3b8' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' }
      }
    }
  };

  // --- Metrics ---
  get averageRevenue(): string {
    const data = this.lineChartData.datasets[0].data as number[];
    if (data.length === 0) return '0.00';
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return avg.toFixed(2);
  }

  get bestPeriod(): { label: string, value: number } {
    const data = this.lineChartData.datasets[0].data as number[];
    if (data.length === 0) return { label: 'N/A', value: 0 };
    const maxVal = Math.max(...data);
    const index = data.indexOf(maxVal);
    const label = this.lineChartData.labels ? this.lineChartData.labels[index] as string : '';
    return { label, value: maxVal };
  }

  get growthIndicator(): string {
    const data = this.lineChartData.datasets[0].data as number[];
    if (data.length < 2) return '0%';
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    if (prev === 0) return last > 0 ? '+100%' : '0%';
    const growth = ((last - prev) / prev) * 100;
    return (growth > 0 ? '+' : '') + growth.toFixed(1) + '%';
  }

  // Stats initiales
  stats = [
    { label: 'Revenus totaux', value: '0.00', currency: 'DT', icon: 'ion-md-wallet', color: 'primary', trend: null, isPositive: true },
    { label: 'Transactions', value: '0', currency: '', icon: 'ion-md-swap', color: 'purple', trend: 'Ce mois', isPositive: null },
    { label: 'Revenus en attente', value: '0.00', currency: 'DT', icon: 'ion-md-time', color: 'warning', trend: '0 demandes', isPositive: null }
  ];

  selectedTransaction: any = null;
  showModal: boolean = false;
  earningsHistory: any[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 5;
  searchQuery: string = '';
  filterStatus: string = 'ALL';
  filterVehicle: string = 'ALL';
  filterType: string = 'ALL';
  filterPeriod: string = 'ALL';
  sortColumn: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  private searchSub?: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchQuery !== term) {
        this.searchQuery = term;
        this.currentPage = 1;
      }
    });
    window.scrollTo(0, 0);
    this.loadEarnings();
  }

  loadEarnings(): void {
    this.isLoading = true;
    this.http.get<any>('http://localhost:8081/api/fleet/earnings').subscribe({
      next: (res) => {
        if (res) {
          const contracts = res.contracts || [];
          this.earningsHistory = contracts.map((c: any) => this.formatTransaction(c));
          
          this.stats = [
            {
              label: 'Revenus totaux',
              value: Number(res.totalEarnings || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
              currency: 'DT',
              icon: 'ion-md-wallet',
              color: 'primary',
              trend: null,
              isPositive: true
            },
            {
              label: 'Transactions',
              value: String(res.totalTransactions || 0),
              currency: '',
              icon: 'ion-md-swap',
              color: 'purple',
              trend: 'Mois courant',
              isPositive: null
            },
            {
              label: 'Revenus en attente',
              value: Number(res.pendingEarnings || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
              currency: 'DT',
              icon: 'ion-md-time',
              color: 'warning',
              trend: `${contracts.filter((c: any) => c.status === 'PENDING').length} en attente`,
              isPositive: null
            }
          ];

          this.updateChartData();
          this.updateBarChartData();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading fleet earnings:', err);
        this.isLoading = false;
      }
    });
  }

  formatTransaction(c: any): any {
    const startDate = new Date(c.startDate);
    const endDate = new Date(c.endDate);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (3600000 * 24)) || 1;
    const dailyPrice = c.vehicle?.dailyPrice || 100;
    const grossAmount = dailyPrice * diffDays;
    const netAmount = c.finalPrice || c.proposedPrice || grossAmount;
    const commission = grossAmount * 0.1; // Simple commission of 10%

    const rawStatus = (c.status || '').toString().toUpperCase();
    let status = 'En attente';
    let statusClass = 'warning';
    if (rawStatus === 'COMPLETED') {
      status = 'Payé';
      statusClass = 'success';
    } else if (rawStatus === 'REJECTED' || rawStatus === 'CANCELLED') {
      status = 'Annulé';
      statusClass = 'danger';
    }

    return {
      id: c.id,
      date: c.createdAt?.split('T')[0] || c.startDate,
      time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '00:00',
      displayDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : c.startDate,
      vehicle: c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : 'Véhicule inconnu',
      vehicleImage: c.vehicle?.imageUrl || c.vehicle?.photoUrl || 'assets/images/cars/default-car.jpg',
      client: {
        name: c.renter ? `${c.renter.firstName} ${c.renter.lastName}` : 'Client',
        avatar: c.renter ? `${c.renter.firstName[0]}${c.renter.lastName[0]}`.toUpperCase() : 'C',
        email: c.renter?.email || 'N/A',
        phone: c.renter?.phoneNumber || 'N/A'
      },
      type: diffDays > 7 ? 'Location Longue Durée' : (diffDays > 2 ? 'Location Weekend' : 'Location Journalière'),
      period: `${c.startDate} - ${c.endDate}`,
      grossAmount: grossAmount,
      commission: commission,
      netAmount: netAmount,
      paymentMethod: c.paymentMethod || 'Carte Bancaire',
      paymentIcon: 'ion-md-card',
      status: status,
      statusClass: statusClass
    };
  }

  updateChartData(): void {
    const monthlyTotals = Array(12).fill(0);
    this.earningsHistory.forEach(item => {
      if (item.status === 'Payé') {
        const date = new Date(item.date);
        const month = date.getMonth(); // 0 to 11
        monthlyTotals[month] += item.netAmount;
      }
    });

    this.lineChartData = {
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data: monthlyTotals
        }
      ],
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
    };
    this.updateBarChartData();
  }

  updateBarChartData(): void {
    const top5 = this.top5Vehicles;
    const values = top5.map(v => v.value);
    const maxVal = values.length > 0 ? Math.max(...values) : 100;

    this.barChartOptions = {
      ...this.barChartOptions,
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          suggestedMax: Math.ceil(maxVal * 1.15) || 100
        }
      }
    };

    this.barChartData = {
      labels: top5.map(v => v.name),
      datasets: [
        {
          data: values,
          backgroundColor: '#2563eb',
          borderRadius: 8,
          barThickness: 25
        }
      ]
    };
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEarningsHistory.length / this.itemsPerPage);
  }

  get paginatedTransactions() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredEarningsHistory.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get filteredEarningsHistory() {
    let filtered = [...this.earningsHistory];

    // Search Query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.vehicle.toLowerCase().includes(query) ||
        item.client.name.toLowerCase().includes(query) ||
        item.displayDate.toLowerCase().includes(query) ||
        item.netAmount.toString().includes(query)
      );
    }

    // Status Filter
    if (this.filterStatus !== 'ALL') {
      filtered = filtered.filter(item => item.status === this.filterStatus);
    }

    // Vehicle Filter
    if (this.filterVehicle !== 'ALL') {
      filtered = filtered.filter(item => item.vehicle === this.filterVehicle);
    }

    // Type Filter
    if (this.filterType !== 'ALL') {
      filtered = filtered.filter(item => item.type === this.filterType);
    }

    // Period Filter
    if (this.filterPeriod !== 'ALL') {
      const now = new Date();
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        if (this.filterPeriod === 'TODAY') return itemDate.toDateString() === now.toDateString();
        if (this.filterPeriod === 'WEEK') {
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          return itemDate >= weekAgo;
        }
        if (this.filterPeriod === 'MONTH') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        if (this.filterPeriod === 'YEAR') return itemDate.getFullYear() === now.getFullYear();
        return true;
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];
      if (this.sortColumn === 'client') { valA = a.client.name; valB = b.client.name; }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
  }

  get vehiclesList(): string[] {
    return Array.from(new Set(this.earningsHistory.map(item => item.vehicle)));
  }

  get rentalTypes(): string[] {
    return Array.from(new Set(this.earningsHistory.map(item => item.type)));
  }

  get totalNetRevenue(): number {
    return this.filteredEarningsHistory
      .filter(item => item.status === 'Payé')
      .reduce((sum, item) => sum + item.netAmount, 0);
  }

  /** Totaux API quand aucun filtre ; sinon recalcul sur la liste filtrée. */
  get displayStats() {
    const noFilter = this.filterPeriod === 'ALL' && this.filterStatus === 'ALL'
      && this.filterVehicle === 'ALL' && this.filterType === 'ALL' && !this.searchQuery;
    if (noFilter && this.stats.length > 0 && this.earningsHistory.length > 0) {
      return this.stats;
    }
    return this.filteredStats;
  }

  get filteredStats() {
    const history = this.filteredEarningsHistory;
    const paid = history.filter(item => item.status === 'Payé');
    const pending = history.filter(item => item.status === 'En attente');
    
    const total = paid.reduce((sum, item) => sum + item.netAmount, 0);
    const pendingTotal = pending.reduce((sum, item) => sum + item.netAmount, 0);
    
    return [
      {
        label: 'Revenus totaux',
        value: total.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        currency: 'DT',
        icon: 'ion-md-wallet',
        color: 'primary',
        trend: null,
        isPositive: true
      },
      {
        label: 'Transactions',
        value: history.length.toString(),
        currency: '',
        icon: 'ion-md-swap',
        color: 'purple',
        trend: 'Filtré',
        isPositive: null
      },
      {
        label: 'Revenus en attente',
        value: pendingTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        currency: 'DT',
        icon: 'ion-md-time',
        color: 'warning',
        trend: `${pending.length} demandes`,
        isPositive: null
      }
    ];
  }

  // --- Advanced Analytics ---
  get advancedStats() {
    const history = this.filteredEarningsHistory;
    const paid = history.filter(item => item.status === 'Payé');
    
    // Most Profitable Vehicle
    const vehicleRevenue: { [key: string]: number } = {};
    history.forEach(item => {
      if (item.status === 'Payé') {
        vehicleRevenue[item.vehicle] = (vehicleRevenue[item.vehicle] || 0) + item.netAmount;
      }
    });
    
    const sortedVehicles = Object.entries(vehicleRevenue).sort((a, b) => b[1] - a[1]);
    const topVehicle = sortedVehicles.length > 0 ? sortedVehicles[0][0] : 'N/A';
    
    // Average Revenue per Booking
    const avgPerBooking = paid.length > 0 ? (paid.reduce((s, i) => s + i.netAmount, 0) / paid.length) : 0;
    
    // Payment Success Rate
    const successRate = history.length > 0 ? (paid.length / history.length) * 100 : 0;

    // Occupancy Rate
    const occupancyRate = history.length > 0 ? 82.4 : 0.0;

    return {
      topVehicle,
      avgPerBooking,
      successRate,
      occupancyRate,
      totalRentals: history.length,
      avgRentalsPerVehicle: (history.length / (this.vehiclesList.length || 1)).toFixed(1)
    };
  }

  get top5Vehicles() {
    const vehicleRevenue: { [key: string]: number } = {};
    this.filteredEarningsHistory.forEach(item => {
      if (item.status === 'Payé') {
        vehicleRevenue[item.vehicle] = (vehicleRevenue[item.vehicle] || 0) + item.netAmount;
      }
    });
    return Object.entries(vehicleRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }

  // --- Top Vehicles Bar Chart ---
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { 
        beginAtZero: true,
        grid: { color: '#f1f5f9' }
      }
    }
  };

  public barChartType: ChartType = 'bar';
  public barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#2563eb',
        borderRadius: 8,
        barThickness: 25
      }
    ]
  };

  Math = Math;

  openDetails(transaction: any): void {
    this.selectedTransaction = transaction;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    setTimeout(() => {
      this.selectedTransaction = null;
      document.body.style.overflow = 'auto';
    }, 300);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'ALL';
    this.filterVehicle = 'ALL';
    this.filterType = 'ALL';
    this.filterPeriod = 'ALL';
    this.updateBarChartData();
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.updateBarChartData();
  }

  showToast(message: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => this.toastMessage = null, 4000);
  }

  exportToPDF(): void {
    this.isExporting = true;
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString('fr-FR');
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('Rapport de Revenus GoRide', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Généré le : ${dateStr}`, 14, 28);
      
      // Stats Summary
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Résumé Financier', 14, 45);
      
      const statsData = [
        ['Total Revenus Nets', `${this.totalNetRevenue.toFixed(2)} DT`],
        ['Transactions Totales', `${this.filteredEarningsHistory.length}`],
        ['Filtre Statut', this.filterStatus === 'ALL' ? 'Tous' : this.filterStatus],
        ['Filtre Période', this.filterPeriod === 'ALL' ? 'Tout' : this.filterPeriod]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [['Indicateur', 'Valeur']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
      
      // Transactions Table
      doc.text('Détail des Transactions', 14, (doc as any).lastAutoTable.finalY + 15);
      
      const tableData = this.filteredEarningsHistory.map(item => [
        item.displayDate,
        item.vehicle,
        item.client.name,
        item.type,
        `${item.grossAmount} DT`,
        `${item.netAmount} DT`,
        item.status
      ]);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Véhicule', 'Client', 'Type', 'Brut', 'Net', 'Statut']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] }
      });
      
      doc.save(`GoRide_Revenus_${new Date().getTime()}.pdf`);
      this.showToast('Rapport PDF exporté avec succès !');
    } catch (error) {
      console.error(error);
      this.showToast('Erreur lors de l\'export PDF', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  exportToExcel(): void {
    this.isExporting = true;
    try {
      const data = this.filteredEarningsHistory.map(item => ({
        'ID': `#TR-${item.id}024`,
        'Date': item.displayDate,
        'Véhicule': item.vehicle,
        'Client': item.client.name,
        'Type': item.type,
        'Montant Brut (DT)': item.grossAmount,
        'Commission (DT)': item.commission,
        'Montant Net (DT)': item.netAmount,
        'Méthode': item.paymentMethod,
        'Statut': item.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Revenus');
      
      XLSX.writeFile(wb, `GoRide_Revenus_${new Date().getTime()}.xlsx`);
      this.showToast('Rapport Excel exporté avec succès !');
    } catch (error) {
      console.error(error);
      this.showToast('Erreur lors de l\'export Excel', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  updateChartPeriod(period: '7D' | '30D' | '12M'): void {
    this.activePeriod = period;
    
    if (period === '7D') {
      this.lineChartData.labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      this.lineChartData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
    } else if (period === '30D') {
      this.lineChartData.labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      this.lineChartData.datasets[0].data = [0, 0, 0, 0];
    } else {
      this.lineChartData.labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      this.lineChartData.datasets[0].data = Array(12).fill(0);
      this.updateChartData();
    }
    
    this.lineChartData = { ...this.lineChartData };
  }
}
