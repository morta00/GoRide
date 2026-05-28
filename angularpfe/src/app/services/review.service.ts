import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review } from '../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:8081/api/reviews';

  constructor(private http: HttpClient) { }

  getReviewByReservation(reservationId: number): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/reservation/${reservationId}`);
  }

  createReview(review: Review): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, review);
  }

  updateReview(id: number, review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/${id}`, review);
  }

  getPendingReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/client/pending`);
  }

  getSentReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/client/sent`);
  }

  submitPlatformFeedback(rating: number, comment: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/client/platform-feedback`, { rating, comment });
  }

  getPlatformFeedbacks(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/client/platform-feedback`);
  }
}
