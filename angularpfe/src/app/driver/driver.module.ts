/** Compilation Errors Fixed - Recompiling */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';

import { DriverRoutingModule } from './driver-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';
import { RidesComponent } from './pages/rides/rides.component';
import { RequestsComponent } from './pages/requests/requests.component';
import { VehicleComponent } from './pages/vehicle/vehicle.component';
import { EarningsComponent } from './pages/earnings/earnings.component';
import { ProfileComponent } from '../profile/profile.component';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { CreateTripComponent } from './pages/create-trip/create-trip.component';
import { PartnerVehiclesComponent } from './pages/partner-vehicles/partner-vehicles.component';
import { RentalsComponent } from './pages/rentals/rentals.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { DriverHistoryComponent } from './pages/history/driver-history.component';
import { DriverConversationsComponent } from './pages/conversations/driver-conversations.component';
import { DriverNotificationsComponent } from './pages/notifications/driver-notifications.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { DriverReviewsComponent } from './pages/driver-reviews/driver-reviews.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { LogoComponent } from '../shared/components/logo/logo.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    DashboardHomeComponent,
    EarningsComponent,
    RentalsComponent,
    PaymentsComponent,
    DriverHistoryComponent,
    DriverConversationsComponent,
    DriverNotificationsComponent,
    SettingsComponent,
    DriverReviewsComponent,
    ReviewsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DriverRoutingModule,
    NgChartsModule,
    ProfileAvatarComponent,
    LogoComponent,
    ProfileComponent,
    RidesComponent,
    RequestsComponent,
    CreateTripComponent,
    VehicleComponent,
    PartnerVehiclesComponent,
    TranslateModule
  ]
})
export class DriverModule { }
