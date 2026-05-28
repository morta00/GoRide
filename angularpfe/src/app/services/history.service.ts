import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface HistoryItem {
  id: number;
  type: string;
  title: string;
  description: string;
  vehicleName?: string;
  ownerName?: string;
  amount: number;
  status: string;
  date: string;
  periodStart?: string;
  periodEnd?: string;
  relatedEntityId: number;
  relatedEntityType: string;
  reviewId?: number;
  review?: any;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = `${environment.apiUrl}/history`;

  constructor(private http: HttpClient) { }

  getMyHistory(): Observable<HistoryItem[]> {
    return this.http.get<HistoryItem[]>(`${this.apiUrl}/client`);
  }
}
