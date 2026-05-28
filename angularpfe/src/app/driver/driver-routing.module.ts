import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';
import { RidesComponent } from './pages/rides/rides.component';
import { RequestsComponent } from './pages/requests/requests.component';
import { VehicleComponent } from './pages/vehicle/vehicle.component';
import { EarningsComponent } from './pages/earnings/earnings.component';
import { ProfileComponent } from '../profile/profile.component';
import { CreateTripComponent } from './pages/create-trip/create-trip.component';
import { PartnerVehiclesComponent } from './pages/partner-vehicles/partner-vehicles.component';
import { RentalsComponent } from './pages/rentals/rentals.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { DriverHistoryComponent } from './pages/history/driver-history.component';
import { DriverConversationsComponent } from './pages/conversations/driver-conversations.component';
import { DriverNotificationsComponent } from './pages/notifications/driver-notifications.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { DriverReviewsComponent } from './pages/driver-reviews/driver-reviews.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'trips', component: RidesComponent },
      { path: 'requests', component: RequestsComponent },
      { path: 'create-trip', component: CreateTripComponent },
      { path: 'my-vehicle', component: VehicleComponent },
      { path: 'partner-vehicles', component: PartnerVehiclesComponent },
      { path: 'rentals', redirectTo: 'my-vehicle', pathMatch: 'full' },
      { path: 'earnings', component: EarningsComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'history', component: DriverHistoryComponent },
      { path: 'conversations', component: DriverConversationsComponent },
      { path: 'notifications', component: DriverNotificationsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'reviews', component: DriverReviewsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DriverRoutingModule { }
