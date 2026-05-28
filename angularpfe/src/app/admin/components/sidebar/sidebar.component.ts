import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {

  counts: any = {
    payments: 0,
    support: 0,
    complaints: 0,
    reports: 0,
    notifications: 0,
    validations: 0
  };

  constructor(private authService: AuthService, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadSidebarCounts();
  }

  loadSidebarCounts(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/sidebar-counts`).subscribe({
      next: (data) => {
        if (data) {
          this.counts = data;
        }
      },
      error: (err) => {
        console.error('Error loading sidebar counts:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
