import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { FleetHomeComponent } from './pages/fleet-home/fleet-home.component';
import { MyVehiclesComponent } from './pages/my-vehicles/my-vehicles.component';
import { AddVehicleComponent } from './pages/add-vehicle/add-vehicle.component';
import { RequestsComponent } from './pages/requests/requests.component';
import { EarningsComponent } from './pages/earnings/earnings.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { HistoryComponent } from './pages/history/history.component';
import { ProfileComponent } from '../profile/profile.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { MessagesComponent } from './pages/messages/messages.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: FleetHomeComponent },
      { path: 'vehicles', component: MyVehiclesComponent },
      { path: 'add-vehicle', component: AddVehicleComponent },
      { path: 'bookings', component: RequestsComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'earnings', component: EarningsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'payments', component: EarningsComponent }, // Reuse earnings for now
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FleetRoutingModule { }
