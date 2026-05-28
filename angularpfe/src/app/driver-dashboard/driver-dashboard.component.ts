import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-driver-dashboard-legacy',
  templateUrl: './driver-dashboard.component.html',
  styleUrls: [] 
})
export class DriverDashboardComponent implements OnInit {
  user: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }
}
