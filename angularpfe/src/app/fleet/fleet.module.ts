import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FleetRoutingModule } from './fleet-routing.module';
import { FleetHomeComponent } from './pages/fleet-home/fleet-home.component';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { MyVehiclesComponent } from './pages/my-vehicles/my-vehicles.component';
import { AddVehicleComponent } from './pages/add-vehicle/add-vehicle.component';
import { RequestsComponent } from './pages/requests/requests.component';
import { EarningsComponent } from './pages/earnings/earnings.component';


import { FormsModule } from '@angular/forms';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { LogoComponent } from '../shared/components/logo/logo.component';
import { NgChartsModule } from 'ng2-charts';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryComponent } from './pages/history/history.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { MessagesComponent } from './pages/messages/messages.component';

@NgModule({
  declarations: [
    FleetHomeComponent,
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    EarningsComponent,
    MessagesComponent
  ],
  imports: [
    CommonModule,
    FleetRoutingModule,
    FormsModule,
    ProfileAvatarComponent,
    LogoComponent,
    MyVehiclesComponent,
    AddVehicleComponent,
    RequestsComponent,
    HistoryComponent,
    ReviewsComponent,
    NgChartsModule,
    TranslateModule
  ]
})
export class FleetModule { }
