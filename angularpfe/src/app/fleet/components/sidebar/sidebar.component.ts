import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { RoleService, SidebarSection, RoleDefinition } from '../../../auth/role.service';
import { MessagingService } from '../../../services/messaging.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  menuSections: SidebarSection[] = [];
  activeRoleData?: RoleDefinition;
  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private messagingService: MessagingService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Initialiser le WebSocket pour les notifications globales
    this.messagingService.initWebSocket();

    this.subs.add(
      this.roleService.activeRole$.subscribe(role => {
        if (role) {
          this.menuSections = this.roleService.getSidebarMenu(role);
          this.activeRoleData = this.roleService.getRoleDefinition(role);
          this.loadSidebarCounts();
        }
      })
    );

    // Rafraîchir le badge depuis l'API fleet (location uniquement, pas courses/support)
    this.subs.add(
      this.messagingService.countsRefresh$.subscribe(() => this.loadSidebarCounts())
    );
    this.subs.add(
      this.messagingService.message$.subscribe(msg => {
        if (msg && (msg as any).type !== 'READ_EVENT') {
          this.loadSidebarCounts();
        }
      })
    );

    // Charger les badges toutes les 10 secondes
    const intervalId = setInterval(() => {
      this.loadSidebarCounts();
    }, 10000);
    this.subs.add(new Subscription(() => clearInterval(intervalId)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadSidebarCounts(): void {
    this.http.get<any>('http://localhost:8081/api/fleet/sidebar-counts').subscribe({
      next: (counts) => {
        if (!counts) return;
        this.menuSections.forEach(section => {
          section.items.forEach(item => {
            if (item.route.includes('/bookings')) {
              item.badge = counts.bookings > 0 ? String(counts.bookings) : undefined;
              item.badgeClass = 'badge-warning';
            } else if (item.route.includes('/messages')) {
              item.badge = counts.messages > 0 ? String(counts.messages) : undefined;
              item.badgeClass = 'badge-primary';
            } else if (item.route.includes('/notifications')) {
              item.badge = counts.notifications > 0 ? String(counts.notifications) : undefined;
              item.badgeClass = 'badge-danger';
            } else if (item.route.includes('/reviews')) {
              item.badge = counts.reviews > 0 ? String(counts.reviews) : undefined;
              item.badgeClass = 'badge-info';
            } else if (item.route.includes('/payments')) {
              item.badge = counts.payments > 0 ? String(counts.payments) : undefined;
              item.badgeClass = 'badge-success';
            } else if (item.route.includes('/vehicles')) {
              item.badge = counts.vehicles > 0 ? String(counts.vehicles) : undefined;
              item.badgeClass = 'badge-primary';
            }
          });
        });
      },
      error: (err) => {
        console.error('Error loading fleet sidebar counts:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
