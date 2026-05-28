import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { DriverReviewService } from '../../services/driver-review.service';
import { DriverReview, ReviewSummary } from '../../models/driver.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-driver-reviews',
  templateUrl: './driver-reviews.component.html',
  styleUrls: ['./driver-reviews.component.css']
})
export class DriverReviewsComponent implements OnInit, OnDestroy {
  reviews: DriverReview[] = [];
  filteredReviews: DriverReview[] = [];
  summary: ReviewSummary = { averageRating: 0, totalReviews: 0, passengerReviews: 0, companyReviews: 0 };
  
  searchTerm: string = '';
  activeFilter: string = 'ALL';
  sortOrder: string = 'recent';
  
  showModal: boolean = false;
  selectedReview: DriverReview | null = null;
  
  private sub: Subscription = new Subscription();
  private searchSub?: Subscription;

  constructor(
    private reviewService: DriverReviewService,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.reviewService.refreshReviews();
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.sub.add(
      this.reviewService.getReviews().subscribe(data => {
        this.reviews = data;
        this.applyFilters();
        this.updateSummary();
      })
    );
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.sub.unsubscribe();
  }

  updateSummary(): void {
    this.reviewService.getSummary().subscribe(s => this.summary = s);
  }

  applyFilters(): void {
    let result = [...this.reviews];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r => 
        r.reviewerName.toLowerCase().includes(term) || 
        r.comment.toLowerCase().includes(term) ||
        (r.relatedTitle && r.relatedTitle.toLowerCase().includes(term))
      );
    }

    // Type Filter
    if (this.activeFilter !== 'ALL') {
      if (this.activeFilter === 'PASSENGER') result = result.filter(r => r.reviewerType === 'PASSENGER');
      else if (this.activeFilter === 'COMPANY') result = result.filter(r => r.reviewerType === 'COMPANY');
      else if (this.activeFilter === '5STARS') result = result.filter(r => r.rating === 5);
      else if (this.activeFilter === '4STARS') result = result.filter(r => r.rating >= 4);
    }

    // Sorting
    result.sort((a, b) => {
      if (this.sortOrder === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (this.sortOrder === 'older') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (this.sortOrder === 'best') return b.rating - a.rating;
      if (this.sortOrder === 'worst') return a.rating - b.rating;
      return 0;
    });

    this.filteredReviews = result;
  }

  openDetails(review: DriverReview): void {
    this.selectedReview = review;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedReview = null;
  }

  goToConversation(review: DriverReview): void {
    if (review.reviewerType === 'PASSENGER') {
      this.router.navigate(['/driver/conversations']);
    } else {
      this.router.navigate(['/driver/conversations'], { queryParams: { companyOfferId: review.relatedEntityId } });
    }
    this.closeModal();
  }

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }

  hasHalfStar(rating: number): boolean {
    return rating % 1 !== 0;
  }

  getEmptyStars(rating: number): number[] {
    const emptyStars = 5 - Math.ceil(rating);
    return Array(emptyStars).fill(0);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
