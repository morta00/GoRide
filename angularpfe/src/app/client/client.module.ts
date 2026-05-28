import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClientRoutingModule } from './client-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';
import { VehicleCatalogModule } from '../shared/vehicle-catalog/vehicle-catalog.module';
import { MapViewComponent } from './pages/map-view/map-view.component';
import { BookRideComponent } from './pages/book-ride/book-ride.component';
import { RentVehicleComponent } from './pages/rent-vehicle/rent-vehicle.component';
import { MyBookingsComponent } from './pages/my-bookings/my-bookings.component';
import { HistoryComponent } from './pages/history/history.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { ConversationsComponent } from './pages/conversations/conversations.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { SettingsComponent } from './pages/settings/settings.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { ProfileComponent } from '../profile/profile.component';
import { RequestRideComponent } from './pages/request-ride/request-ride.component';
import { CurrentRideComponent } from './pages/current-ride/current-ride.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { LogoComponent } from '../shared/components/logo/logo.component';
import { TranslateModule } from '@ngx-translate/core';
import { AiInsightPanelComponent } from '../components/ai-insight-panel/ai-insight-panel.component';

@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    MapViewComponent,
    ConversationsComponent,
    FavoritesComponent,
    RequestRideComponent,
    BookRideComponent
  ],
  imports: [
    CommonModule,
    VehicleCatalogModule,
    ClientRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    AiInsightPanelComponent,
    ProfileAvatarComponent,
    LogoComponent,
    RentVehicleComponent,
    HistoryComponent,
    ProfileComponent,
    NotificationsComponent,
    PaymentsComponent,
    SettingsComponent,
    DashboardHomeComponent,
    ReviewsComponent,
    MyBookingsComponent,
    CurrentRideComponent
  ]
})
export class ClientModule { }
