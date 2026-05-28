import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DriverReview, ReviewSummary } from '../models/driver.models';

@Injectable({
  providedIn: 'root'
})
export class DriverReviewService {
  private reviewsSubject = new BehaviorSubject<DriverReview[]>([]);
  reviews$ = this.reviewsSubject.asObservable();

  private summarySubject = new BehaviorSubject<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
    passengerReviews: 0,
    companyReviews: 0
  });
  summary$ = this.summarySubject.asObservable();

  constructor(private http: HttpClient) {}

  refreshReviews(): void {
    this.http.get<any>(`${environment.apiUrl}/driver/reviews`).subscribe({
      next: (res) => {
        if (res) {
          const reviews = (res.reviews || []).map((r: any) => ({
            ...r,
            avatar: r.avatar || r.photoUrl || undefined
          }));
          this.reviewsSubject.next(reviews);
          
          const passengerReviews = reviews.filter((r: any) => r.reviewerType === 'PASSENGER').length;
          const companyReviews = reviews.filter((r: any) => r.reviewerType === 'COMPANY').length;
          
          this.summarySubject.next({
            averageRating: res.averageRating || 0,
            totalReviews: res.totalReviews || reviews.length,
            passengerReviews: passengerReviews,
            companyReviews: companyReviews
          });
        }
      },
      error: (err) => {
        console.error('Error fetching reviews', err);
      }
    });
  }

  getReviews(): Observable<DriverReview[]> {
    return this.reviews$;
  }

  getSummary(): Observable<ReviewSummary> {
    return this.summary$;
  }
}
