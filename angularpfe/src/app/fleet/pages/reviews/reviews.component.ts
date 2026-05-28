import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { HttpClient } from '@angular/common/http';

interface Review {
  id: number;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  vehicle: string;
  date: Date;
  displayDate: string;
  isVerified: boolean;
  isRecent: boolean;
  ownerReply?: {
    text: string;
    date: string;
    isEdited?: boolean;
    editedDate?: string;
  };
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit, OnDestroy {

  searchTerm: string = '';
  selectedFilter: string = 'ALL';
  selectedPeriod: string = 'ALL';

  // Reply State
  replyingToId: number | null = null;
  replyText: string = '';
  
  // Dropdown State
  openDropdownId: number | null = null;

  // Delete Modal State
  reviewToDelete: number | null = null;

  // Toast State
  showToast: boolean = false;
  toastMessage: string = '';

  reviews: Review[] = [];
  isLoading = false;

  Math = Math;

  // Chart Configuration
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont: { size: 14, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: '#2563eb', borderRadius: 6, barPercentage: 0.5 }]
  };

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
      }
    });
    window.scrollTo(0, 0);
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:8081/api/fleet/reviews').subscribe({
      next: (data) => {
        this.reviews = (data || []).map(r => ({
          id: r.id,
          clientName: r.clientName || 'Client anonyme',
          clientAvatar: 'https://i.pravatar.cc/150?u=' + (r.clientId || r.id),
          rating: r.vehicleRating || 5,
          comment: r.comment || '',
          vehicle: r.vehicleName || 'Véhicule',
          date: new Date(r.createdAt),
          displayDate: this.formatRelativeTime(r.createdAt),
          isVerified: true,
          isRecent: (new Date().getTime() - new Date(r.createdAt).getTime()) < 3600000 * 24
        }));
        this.isLoading = false;
        this.updateChartData();
      },
      error: (err) => {
        console.error('Error loading fleet reviews:', err);
        this.reviews = [];
        this.isLoading = false;
      }
    });
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

  get filteredReviews(): Review[] {
    let filtered = [...this.reviews];

    // Search
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.clientName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.vehicle.toLowerCase().includes(q) ||
        r.displayDate.toLowerCase().includes(q)
      );
    }

    // Type Filter
    if (this.selectedFilter !== 'ALL') {
      if (this.selectedFilter === '5STAR') filtered = filtered.filter(r => r.rating === 5);
      else if (this.selectedFilter === '4STAR') filtered = filtered.filter(r => r.rating === 4);
      else if (this.selectedFilter === '3STAR') filtered = filtered.filter(r => r.rating === 3);
      else if (this.selectedFilter === 'POSITIVE') filtered = filtered.filter(r => r.rating >= 4);
      else if (this.selectedFilter === 'NEGATIVE') filtered = filtered.filter(r => r.rating <= 3);
    }

    // Period Filter
    if (this.selectedPeriod !== 'ALL') {
      const now = new Date();
      filtered = filtered.filter(r => {
        const d = r.date;
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

  getFilterCount(filter: string): number {
    if (filter === 'ALL') return this.reviews.length;
    if (filter === '5STAR') return this.reviews.filter(r => r.rating === 5).length;
    if (filter === '4STAR') return this.reviews.filter(r => r.rating === 4).length;
    if (filter === '3STAR') return this.reviews.filter(r => r.rating === 3).length;
    if (filter === 'POSITIVE') return this.reviews.filter(r => r.rating >= 4).length;
    if (filter === 'NEGATIVE') return this.reviews.filter(r => r.rating <= 3).length;
    return 0;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'ALL';
    this.selectedPeriod = 'ALL';
    this.updateChartData();
  }

  // --- Advanced Statistics ---
  get averageRating(): string {
    if (this.filteredReviews.length === 0) return '0.0';
    const sum = this.filteredReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / this.filteredReviews.length).toFixed(1);
  }

  get totalReviews(): number {
    return this.filteredReviews.length;
  }

  get satisfactionRate(): number {
    if (this.totalReviews === 0) return 0;
    const positive = this.filteredReviews.filter(r => r.rating >= 4).length;
    return Math.round((positive / this.totalReviews) * 100);
  }

  get positivePercentage(): number {
    return this.satisfactionRate;
  }

  get negativePercentage(): number {
    if (this.totalReviews === 0) return 0;
    const negative = this.filteredReviews.filter(r => r.rating <= 3).length;
    return Math.round((negative / this.totalReviews) * 100);
  }

  get satisfactionTrend(): string {
    const avg = parseFloat(this.averageRating);
    if (avg >= 4.5) return '+5.2%';
    if (avg >= 4) return '+2.1%';
    if (avg >= 3) return '-1.5%';
    return '-4.8%';
  }

  get topVehicles(): { name: string, rating: number }[] {
    const vehicleStats = this.getVehicleStats();
    return vehicleStats.filter(v => v.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 3);
  }

  get worstVehicles(): { name: string, rating: number }[] {
    const vehicleStats = this.getVehicleStats();
    return vehicleStats.filter(v => v.rating < 4).sort((a, b) => a.rating - b.rating).slice(0, 3);
  }

  private getVehicleStats(): { name: string, rating: number }[] {
    const map = new Map<string, { sum: number, count: number }>();
    this.filteredReviews.forEach(r => {
      if (!map.has(r.vehicle)) map.set(r.vehicle, { sum: 0, count: 0 });
      const stat = map.get(r.vehicle)!;
      stat.sum += r.rating;
      stat.count++;
    });
    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      rating: parseFloat((stat.sum / stat.count).toFixed(1))
    }));
  }

  get ratingDistribution(): { star: number, count: number, percentage: number }[] {
    const dist = [5, 4, 3, 2, 1].map(star => {
      const count = this.filteredReviews.filter(r => r.rating === star).length;
      const percentage = this.totalReviews > 0 ? (count / this.totalReviews) * 100 : 0;
      return { star, count, percentage };
    });
    return dist;
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  // --- Chart Update ---
  updateChartData(): void {
    const sortedReviews = [...this.filteredReviews].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Group by Date String (short format like "08 Mai")
    const dateMap = new Map<string, { sum: number, count: number }>();
    sortedReviews.forEach(r => {
      const dateStr = r.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (!dateMap.has(dateStr)) dateMap.set(dateStr, { sum: 0, count: 0 });
      const stat = dateMap.get(dateStr)!;
      stat.sum += r.rating;
      stat.count++;
    });

    const labels = Array.from(dateMap.keys());
    const data = Array.from(dateMap.values()).map(stat => parseFloat((stat.sum / stat.count).toFixed(1)));

    this.barChartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: data.map(val => val >= 4 ? '#10b981' : val === 3 ? '#f59e0b' : '#ef4444'),
          borderRadius: 6,
          barPercentage: 0.5
        }
      ]
    };
  }

  // --- Dropdown Management ---
  toggleDropdown(id: number, event: Event): void {
    event.stopPropagation();
    if (this.openDropdownId === id) {
      this.openDropdownId = null;
    } else {
      this.openDropdownId = id;
    }
  }

  closeDropdown(): void {
    this.openDropdownId = null;
  }

  // --- Reply Management ---
  startReply(reviewId: number, currentText: string = ''): void {
    this.replyingToId = reviewId;
    this.replyText = currentText;
  }

  cancelReply(): void {
    this.replyingToId = null;
    this.replyText = '';
  }

  submitReply(reviewId: number): void {
    if (!this.replyText || this.replyText.trim().length === 0) return;
    if (this.replyText.length > 500) return;

    const review = this.reviews.find(r => r.id === reviewId);
    if (review) {
      if (review.ownerReply) {
        review.ownerReply.text = this.replyText.trim();
        review.ownerReply.isEdited = true;
        review.ownerReply.editedDate = 'À l\'instant';
        this.showSuccessToast('Votre réponse a été modifiée avec succès.');
      } else {
        review.ownerReply = {
          text: this.replyText.trim(),
          date: 'À l\'instant'
        };
        this.showSuccessToast('Votre réponse a été publiée avec succès.');
      }
    }
    this.cancelReply();
  }

  // --- Delete Confirmation Logic ---
  requestDelete(reviewId: number): void {
    this.reviewToDelete = reviewId;
  }

  cancelDelete(): void {
    this.reviewToDelete = null;
  }

  confirmDelete(): void {
    if (this.reviewToDelete !== null) {
      const reviewIndex = this.reviews.findIndex(r => r.id === this.reviewToDelete);
      if (reviewIndex > -1 && this.reviews[reviewIndex].ownerReply) {
        this.reviews[reviewIndex].ownerReply = undefined;
        this.reviews = [...this.reviews];
        this.showSuccessToast('Votre réponse a été supprimée.');
      }
      this.reviewToDelete = null;
    }
  }

  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
