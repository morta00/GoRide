import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  pendingReviewsCount = 0;
  pendingRequestsCount = 0;
  conversationsCount = 0;
  notificationsCount = 0;
  invoicesCount = 0;

  private refreshInterval: any;

  constructor(
    private authService: AuthService,
    private companyService: CompanyService
  ) { }

  ngOnInit(): void {
    this.fetchBadges();
    this.refreshInterval = setInterval(() => this.fetchBadges(), 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  fetchBadges(): void {
    this.companyService.getSidebarCounts().subscribe({
      next: (counts) => {
        if (counts) {
          this.pendingRequestsCount = counts.pendingRequests || 0;
          this.pendingReviewsCount = counts.pendingReviews || 0;
          this.conversationsCount = counts.unreadConversations || 0;
          this.notificationsCount = counts.unreadNotifications || 0;
          this.invoicesCount = counts.unpaidInvoices || 0;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des badges de la sidebar entreprise', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
