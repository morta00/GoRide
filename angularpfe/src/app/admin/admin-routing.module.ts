import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { UsersComponent } from './pages/users/users.component';
import { VehiclesComponent } from './pages/vehicles/vehicles.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ValidationsComponent } from './pages/validations/validations.component';
import { ProfileComponent } from '../profile/profile.component';
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

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: AdminHomeComponent },
      { path: 'management', component: ManagementComponent },
      { path: 'users', redirectTo: 'management', pathMatch: 'full' },
      { path: 'validations', redirectTo: 'management', pathMatch: 'full' },
      { path: 'vehicles', redirectTo: 'management', pathMatch: 'full' },
      
      { path: 'services', component: ServicesComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'revenue', component: RevenueComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'support', component: SupportComponent },
      { path: 'complaints', component: ComplaintsComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'reports', component: ReportsComponent },
      
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
