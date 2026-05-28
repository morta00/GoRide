import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { LogoComponent } from '../shared/components/logo/logo.component';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { UsersComponent } from './pages/users/users.component';
import { VehiclesComponent } from './pages/vehicles/vehicles.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ValidationsComponent } from './pages/validations/validations.component';
import { PlaceholderComponent } from './pages/placeholder/placeholder.component';
import { ManagementComponent } from './pages/management/management.component';
import { ServicesComponent } from './pages/services/services.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { RevenueComponent } from './pages/revenue/revenue.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { SupportComponent } from './pages/support/support.component';
import { ComplaintsComponent } from './pages/complaints/complaints.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ProfileComponent } from '../profile/profile.component';

@NgModule({
  declarations: [
    AdminHomeComponent,
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    UsersComponent,
    VehiclesComponent,
    BookingsComponent,
    SettingsComponent,
    ValidationsComponent,
    PlaceholderComponent,
    ManagementComponent,
    ServicesComponent,
    PaymentsComponent,
    RevenueComponent,
    NotificationsComponent,
    SupportComponent,
    ComplaintsComponent,
    ReviewsComponent,
    ReportsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    AdminRoutingModule,
    ProfileAvatarComponent,
    LogoComponent,
    ProfileComponent
  ]
})
export class AdminModule { }
