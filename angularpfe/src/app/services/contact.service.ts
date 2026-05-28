import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = 'http://localhost:8081/api/contact';

  constructor(private http: HttpClient) { }

  sendContactMessage(contactData: ContactRequest): Observable<any> {
    return this.http.post(this.apiUrl, contactData);
  }
}
