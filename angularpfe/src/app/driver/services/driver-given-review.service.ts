import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { DriverGivenReview } from '../models/driver.models';

@Injectable({
  providedIn: 'root'
})
export class DriverGivenReviewService {
  private readonly STORAGE_KEY = 'driver_given_vehicle_reviews';

  private reviewsSubject = new BehaviorSubject<DriverGivenReview[]>(this.loadReviews());
  reviews$ = this.reviewsSubject.asObservable();

  constructor() {}

  private loadReviews(): DriverGivenReview[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing given reviews', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return [];
  }

  saveReviews(reviews: DriverGivenReview[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviews));
    this.reviewsSubject.next(reviews);
  }

  getReviewByRentalId(rentalId: string): DriverGivenReview | undefined {
    return this.reviewsSubject.value.find(r => r.rentalId === rentalId);
  }

  createReview(review: DriverGivenReview): void {
    const reviews = this.reviewsSubject.value;
    this.saveReviews([review, ...reviews]);
  }

  hasReviewForRental(rentalId: string): boolean {
    return this.reviewsSubject.value.some(r => r.rentalId === rentalId);
  }
}
