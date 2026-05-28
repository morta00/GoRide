import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Activity {
  id: number;
  refId?: string;
  type: 'PAYMENT' | 'BOOKING' | 'VEHICLE' | 'MAINTENANCE' | 'MESSAGE';
  icon: string;
  title: string;
  description: string;
  fullDescription?: string;
  date: Date;
  displayDate: string;
  time?: string;
  vehicle?: string;
  clientName?: string;
  clientEmail?: string;
  amount?: number;
  period?: string;
  oldStatus?: string;
  newStatus?: string;
  statusLabel?: string;
  statusClass: string;
  isRecent: boolean;
  location?: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  selectedType: string = 'ALL';
  selectedPeriod: string = 'ALL';
  selectedActivity: any = null;
  showModal: boolean = false;
  isLoading = false;
  
  // Export & Toast State
  isExporting: boolean = false;
  showToast: boolean = false;
  toastMessage: string = '';

  // Pagination State
  currentPage: number = 1;
  itemsPerPage: number = 5;
  Math = Math;

  activities: Activity[] = [];
  private searchSub?: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) { }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.currentPage = 1;
      }
    });
    window.scrollTo(0, 0);
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:8081/api/fleet/history').subscribe({
      next: (data) => {
        this.activities = (data || []).map(a => this.formatActivity(a));
        this.isLoading = false;
        this.updateChartData();
      },
      error: (err) => {
        console.error('Error loading fleet history:', err);
        this.activities = [];
        this.isLoading = false;
      }
    });
  }

  formatActivity(a: any): Activity {
    let type: Activity['type'] = 'VEHICLE';
    let icon = 'ion-md-add-circle';
    const titleLower = a.title?.toLowerCase() || '';
    if (titleLower.includes('paye') || titleLower.includes('argent') || titleLower.includes('revenu') || titleLower.includes('versement') || titleLower.includes('transaction')) {
      type = 'PAYMENT';
      icon = 'ion-md-cash';
    } else if (titleLower.includes('accept') || titleLower.includes('confirm') || titleLower.includes('réservation') || titleLower.includes('demande')) {
      type = 'BOOKING';
      icon = 'ion-md-checkmark-circle';
    } else if (titleLower.includes('panne') || titleLower.includes('maintenance') || titleLower.includes('technique') || titleLower.includes('révision')) {
      type = 'MAINTENANCE';
      icon = 'ion-md-construct';
    } else if (titleLower.includes('messag') || titleLower.includes('discut')) {
      type = 'MESSAGE';
      icon = 'ion-md-text';
    }

    return {
      id: a.id,
      refId: 'ACT-' + a.id,
      type: type,
      icon: icon,
      title: a.title,
      description: a.description,
      fullDescription: a.description,
      date: new Date(a.createdAt),
      displayDate: this.formatRelativeTime(a.createdAt),
      time: new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      statusLabel: a.category ? (a.category.toUpperCase() === 'SUCCESS' ? 'Confirmé' : 'Actif') : 'Actif',
      statusClass: a.category || 'info',
      isRecent: (new Date().getTime() - new Date(a.createdAt).getTime()) < 3600000 * 24
    };
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  }

  openDetails(activity: any): void {
    this.selectedActivity = activity;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    document.body.style.overflow = 'auto';
  }

  get filteredActivities(): any[] {
    let filtered = [...this.activities];

    // Search
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.vehicle?.toLowerCase().includes(q) ||
        a.clientName?.toLowerCase().includes(q) ||
        a.displayDate.toLowerCase().includes(q)
      );
    }

    // Type Filter
    if (this.selectedType !== 'ALL') {
      filtered = filtered.filter(a => a.type === this.selectedType);
    }

    // Period Filter
    if (this.selectedPeriod !== 'ALL') {
      const now = new Date();
      filtered = filtered.filter(a => {
        const d = a.date;
        if (this.selectedPeriod === 'TODAY') return d.toDateString() === now.toDateString();
        if (this.selectedPeriod === 'WEEK') {
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo;
        }
        if (this.selectedPeriod === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (this.selectedPeriod === 'YEAR') return d.getFullYear() === now.getFullYear();
        return true;
      });
    }

    return filtered;
  }

  // --- Pagination Logic ---
  get totalPages(): number {
    return Math.ceil(this.filteredActivities.length / this.itemsPerPage);
  }

  get paginatedActivities(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredActivities.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getCount(type: string): number {
    if (type === 'ALL') return this.activities.length;
    return this.activities.filter(a => a.type === type).length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedType = 'ALL';
    this.selectedPeriod = 'ALL';
    this.currentPage = 1;
  }

  // --- Export Logic ---
  async exportPDF() {
    this.isExporting = true;
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('Rapport d\'Historique - GoRide', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString('fr-FR');
      doc.text(`Généré le: ${dateStr}`, 14, 30);
      
      const stats = this.stats;
      doc.setFontSize(12);
      doc.setTextColor(50);
      doc.text(`Total Activités: ${stats.total}`, 14, 40);
      doc.text(`Activité Principale: ${stats.mostFrequent}`, 80, 40);

      const tableData = this.filteredActivities.map(activity => [
        activity.displayDate,
        activity.type,
        activity.title,
        activity.vehicle || '-',
        activity.clientName || '-',
        activity.statusLabel
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Type', 'Activité', 'Véhicule', 'Client', 'Statut']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9, cellPadding: 4 }
      });

      doc.save(`GoRide_Historique_${dateStr.replace(/\//g, '-')}.pdf`);
      this.showSuccessToast('Export PDF réussi !');
    } catch (error) {
      console.error('Erreur export PDF', error);
      this.showSuccessToast('Erreur lors de l\'export PDF');
    } finally {
      this.isExporting = false;
    }
  }

  async exportExcel() {
    this.isExporting = true;
    try {
      const exportData = this.filteredActivities.map(activity => ({
        'Date': activity.displayDate,
        'Type': activity.type,
        'Titre': activity.title,
        'Description': activity.description,
        'Véhicule': activity.vehicle || 'N/A',
        'Client': activity.clientName || 'N/A',
        'Montant (DT)': activity.amount || 0,
        'Statut': activity.statusLabel
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
      
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      XLSX.writeFile(workbook, `GoRide_Historique_${dateStr}.xlsx`);
      
      this.showSuccessToast('Export Excel réussi !');
    } catch (error) {
      console.error('Erreur export Excel', error);
      this.showSuccessToast('Erreur lors de l\'export Excel');
    } finally {
      this.isExporting = false;
    }
  }

  showSuccessToast(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  // --- Statistics ---
  get stats() {
    const filtered = this.filteredActivities;
    
    // Most frequent activity type
    const typeCounts: { [key: string]: number } = {};
    filtered.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });
    
    let mostFrequentType = 'Aucune';
    let maxCount = 0;
    for (const type in typeCounts) {
      if (typeCounts[type] > maxCount) {
        maxCount = typeCounts[type];
        switch(type) {
            case 'BOOKING': mostFrequentType = 'Réservations'; break;
            case 'PAYMENT': mostFrequentType = 'Paiements'; break;
            case 'VEHICLE': mostFrequentType = 'Véhicules'; break;
            case 'MAINTENANCE': mostFrequentType = 'Maintenance'; break;
            case 'MESSAGE': mostFrequentType = 'Messages'; break;
        }
      }
    }

    return {
      total: filtered.length,
      bookings: filtered.filter(a => a.type === 'BOOKING').length,
      payments: filtered.filter(a => a.type === 'PAYMENT').length,
      vehicles: filtered.filter(a => a.type === 'VEHICLE').length,
      maintenance: filtered.filter(a => a.type === 'MAINTENANCE').length,
      mostFrequent: mostFrequentType
    };
  }

  // --- Chart Configuration ---
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        label: 'Activités par jour',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderColor: '#2563eb',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: '#ffffff',
        fill: 'origin',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ],
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4 }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 12 }, color: '#64748b' }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        border: { display: false, dash: [5, 5] },
        ticks: { font: { family: "'Inter', sans-serif", size: 12 }, color: '#64748b', stepSize: 5 }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 13 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };

  public lineChartType: ChartType = 'line';

  updateChartData(): void {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    
    this.activities.forEach(a => {
      const d = new Date(a.date);
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (3600000 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        // Map day to correct index (0 is 6 days ago, 6 is today)
        const index = 6 - diffDays;
        counts[index]++;
      }
    });

    // Generate label days dynamically
    const labels = [];
    const daysName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      labels.push(daysName[d.getDay()]);
    }

    this.lineChartData = {
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data: counts
        }
      ],
      labels: labels
    };
  }

  get groupedActivities() {
    const paginated = this.paginatedActivities;
    const groups: { title: string, items: Activity[] }[] = [];
    
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const todayItems = paginated.filter(a => new Date(a.date).toDateString() === today);
    if (todayItems.length > 0) groups.push({ title: 'Aujourd\'hui', items: todayItems });

    const yesterdayItems = paginated.filter(a => new Date(a.date).toDateString() === yesterdayStr);
    if (yesterdayItems.length > 0) groups.push({ title: 'Hier', items: yesterdayItems });

    const olderItems = paginated.filter(a => new Date(a.date).toDateString() !== today && new Date(a.date).toDateString() !== yesterdayStr);
    if (olderItems.length > 0) groups.push({ title: 'Plus ancien', items: olderItems });

    return groups;
  }

  getIconClass(type: string): string {
    const base = 'activity-icon ';
    switch(type) {
      case 'PAYMENT': return base + 'icon-success';
      case 'BOOKING': return base + 'icon-primary';
      case 'MAINTENANCE': return base + 'icon-warning';
      case 'VEHICLE': return base + 'icon-info';
      case 'MESSAGE': return base + 'icon-purple';
      default: return base + 'icon-light';
    }
  }
}
