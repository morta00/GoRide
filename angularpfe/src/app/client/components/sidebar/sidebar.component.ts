import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { RoleService, SidebarSection } from '../../../auth/role.service';
import { NotificationService } from '../../../services/notification.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeRole: string | null = null;
  menuSections: SidebarSection[] = [];
  activeRoleLabelKey: string = 'CLIENT.ROLES.PASSENGER';
  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private notificationService: NotificationService,
    private http: HttpClient,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.add(
      this.roleService.activeRole$.subscribe(role => {
        this.activeRole = role;
        if (role) {
          this.updateMenu(role);
          this.loadSidebarCounts();
        }
      })
    );

    // Écouter les notifications pour mettre à jour les badges dynamiquement
    this.subs.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.updateBadges(count);
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

  updateMenu(role: string): void {
    this.menuSections = this.roleService.getSidebarMenu(role);
    this.activeRoleLabelKey = this.roleService.getRoleDefinition(role)?.labelKey || 'CLIENT.ROLES.PASSENGER';
  }

  private updateBadges(notifCount: number): void {
    this.menuSections.forEach(section => {
      section.items.forEach(item => {
        if (item.route.includes('/notifications')) {
          item.badge = notifCount > 0 ? notifCount.toString() : undefined;
          item.badgeClass = 'badge-danger';
        }
      });
    });
  }

  logout(): void {
    this.translate.get('COMMON.LOGOUT_CONFIRM').subscribe(msg => {
      if (confirm(msg)) {
        this.authService.logout();
      }
    });
  }

  loadSidebarCounts(): void {
    if (!this.activeRole) return;
    const mode = this.activeRole === 'ROLE_CLIENT' ? 'TENANT' : 'PASSENGER';
    this.notificationService.loadAll();
    this.http.get<any>(`${environment.apiUrl}/client/sidebar-counts?mode=${mode}`).subscribe({
      next: (counts) => {
        if (!counts) return;
        this.menuSections.forEach(section => {
          section.items.forEach(item => {
            if (item.route.includes('/reservations')) {
              const pending = counts.trips ?? counts.reservations ?? 0;
              item.badge = pending > 0 ? String(pending) : undefined;
              item.badgeClass = 'badge-primary';
            } else if (item.route.includes('/reviews')) {
              item.badge = counts.pendingReviews > 0 ? String(counts.pendingReviews) : undefined;
              item.badgeClass = 'badge-warning';
            } else if (item.route.includes('/conversations')) {
              item.badge = counts.conversations > 0 ? String(counts.conversations) : undefined;
              item.badgeClass = 'badge-info';
            } else if (item.route.includes('/notifications')) {
              // Badge géré par notificationService.unreadCount$ (même source que la cloche)
            } else if (item.route.includes('/current-ride')) {
              item.badge = counts.currentRide > 0 ? 'LIVE' : undefined;
              item.badgeClass = 'badge-danger';
            }
          });
        });
      },
      error: (err) => {
        console.error('Error fetching sidebar counts:', err);
      }
    });
  }
}
