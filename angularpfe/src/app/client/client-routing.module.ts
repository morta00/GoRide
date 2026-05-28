import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';
import { BookRideComponent } from './pages/book-ride/book-ride.component';
import { RentVehicleComponent } from './pages/rent-vehicle/rent-vehicle.component';
import { MyBookingsComponent } from './pages/my-bookings/my-bookings.component';
import { HistoryComponent } from './pages/history/history.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { ProfileComponent } from '../profile/profile.component';
import { ExploreVehiclesComponent } from './pages/explore-vehicles/explore-vehicles.component';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { ConversationsComponent } from './pages/conversations/conversations.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { SettingsComponent } from './pages/settings/settings.component';

import { RequestRideComponent } from './pages/request-ride/request-ride.component';
import { CurrentRideComponent } from './pages/current-ride/current-ride.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'explore', component: ExploreVehiclesComponent },
      { path: 'available-rides', component: BookRideComponent },
      { path: 'request-ride', component: RequestRideComponent },
      { path: 'current-ride', component: CurrentRideComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'map', redirectTo: 'explore', pathMatch: 'full' },
      { path: 'book-ride', redirectTo: 'available-rides', pathMatch: 'full' },
      { path: 'rent-vehicle', component: RentVehicleComponent },
      { path: 'reservations', component: MyBookingsComponent },
      { path: 'reservations/:id', component: MyBookingsComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'conversations', component: ConversationsComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'favorites', component: FavoritesComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'security', redirectTo: 'profile', pathMatch: 'full' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientRoutingModule { }
