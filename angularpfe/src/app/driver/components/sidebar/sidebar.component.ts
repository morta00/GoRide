import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NotificationService } from '../../../services/notification.service';
import { DriverConversationService } from '../../services/driver-conversation.service';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

interface DriverSidebarItem {
  labelKey: string;
  icon: string;
  route: string;
  id: string;
  badgeClass?: string;
}

interface DriverSidebarSection {
  titleKey: string;
  items: DriverSidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeRoleLabelKey = 'DRIVER.MENU.ROLE';
  private apiUrl = `${environment.apiUrl}/driver/sidebar-counts`;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subs = new Subscription();

  sidebarCounts = {
    pendingRequests: 0,
    conversations: 0,
    unreadNotifications: 0,
    reviews: 0
  };

  menuSections: DriverSidebarSection[] = [
    {
      titleKey: 'DRIVER.MENU.MAIN',
      items: [
        { labelKey: 'DRIVER.MENU.DASHBOARD', icon: 'ion-md-apps', route: '/driver/dashboard', id: 'dashboard' },
        { labelKey: 'DRIVER.MENU.MY_TRIPS', icon: 'ion-md-navigate', route: '/driver/trips', id: 'trips' },
        { labelKey: 'DRIVER.MENU.REQUESTS', icon: 'ion-md-list-box', route: '/driver/requests', badgeClass: 'badge-warning', id: 'requests' },
        { labelKey: 'DRIVER.MENU.CREATE_TRIP', icon: 'ion-md-add-circle', route: '/driver/create-trip', id: 'create-trip' }
      ]
    },
    {
      titleKey: 'DRIVER.MENU.VEHICLE_SECTION',
      items: [
        { labelKey: 'DRIVER.MENU.MY_VEHICLE', icon: 'ion-md-car', route: '/driver/my-vehicle', id: 'my-vehicle' },
        { labelKey: 'DRIVER.MENU.RENT_VEHICLE', icon: 'ion-md-business', route: '/driver/partner-vehicles', id: 'partner-vehicles' }
      ]
    },
    {
      titleKey: 'DRIVER.MENU.FINANCES_SECTION',
      items: [
        { labelKey: 'DRIVER.MENU.EARNINGS', icon: 'ion-md-wallet', route: '/driver/earnings', id: 'earnings' },
        { labelKey: 'DRIVER.MENU.PAYMENTS', icon: 'ion-md-card', route: '/driver/payments', id: 'payments' },
        { labelKey: 'DRIVER.MENU.HISTORY', icon: 'ion-md-time', route: '/driver/history', id: 'history' }
      ]
    },
    {
      titleKey: 'DRIVER.MENU.COMMUNICATION_SECTION',
      items: [
        { labelKey: 'DRIVER.MENU.CONVERSATIONS', icon: 'ion-md-chatbubbles', route: '/driver/conversations', badgeClass: 'badge-primary', id: 'conversations' },
        { labelKey: 'CLIENT.MENU.NOTIFICATIONS', icon: 'ion-md-notifications', route: '/driver/notifications', badgeClass: 'badge-danger', id: 'notifications' },
        { labelKey: 'DRIVER.MENU.CLIENT_REVIEWS', icon: 'ion-md-star', route: '/driver/reviews', id: 'reviews' }
      ]
    },
    {
      titleKey: 'CLIENT.MENU.ACCOUNT_SECTION',
      items: [
        { labelKey: 'CLIENT.MENU.PROFILE', icon: 'ion-md-person', route: '/driver/profile', id: 'profile' },
        { labelKey: 'CLIENT.MENU.SETTINGS', icon: 'ion-md-settings', route: '/driver/settings', id: 'settings' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private conversationService: DriverConversationService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.notificationService.loadAll();
    this.conversationService.refreshConversations();

    this.subs.add(
      this.notificationService.unreadCount$.subscribe(c => {
        this.sidebarCounts.unreadNotifications = c;
      })
    );
    this.subs.add(
      this.conversationService.conversations$.subscribe(convs => {
        this.sidebarCounts.conversations = (convs || []).reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0
        );
      })
    );

    this.fetchCounts();
    this.intervalId = setInterval(() => {
      this.fetchCounts();
      this.notificationService.loadAll();
      this.conversationService.refreshConversations();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.subs.unsubscribe();
  }

  fetchCounts() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (counts) => {
        if (counts) {
          this.sidebarCounts.pendingRequests = counts.pendingRequests || 0;
          this.sidebarCounts.reviews = counts.reviews || 0;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des sidebar-counts', err);
      }
    });
  }

  getBadgeCount(id: string): number {
    switch (id) {
      case 'requests': return this.sidebarCounts.pendingRequests;
      case 'conversations': return this.sidebarCounts.conversations;
      case 'notifications': return this.sidebarCounts.unreadNotifications;
      default: return 0;
    }
  }

  logout() {
    this.translate.get('COMMON.LOGOUT_CONFIRM').subscribe(msg => {
      if (confirm(msg)) {
        this.authService.logout();
      }
    });
  }
}
