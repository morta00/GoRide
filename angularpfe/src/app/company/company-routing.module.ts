import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { CompanyHomeComponent } from './pages/company-home/company-home.component';
import { EmployeesComponent } from './pages/employees/employees.component';
import { BillingComponent } from './pages/billing/billing.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ProfileComponent } from '../profile/profile.component';
import { ExploreVehiclesComponent } from '../client/pages/explore-vehicles/explore-vehicles.component';

import { CompanyPlaceholderComponent } from './pages/placeholder/placeholder.component';
import { RequestServiceComponent } from './pages/request-service/request-service.component';
import { CompanyRequestsComponent } from './pages/requests/requests.component';
import { CompanyHistoryComponent } from './pages/history/history.component';
import { CompanyReviewsComponent } from './pages/reviews/reviews.component';
import { CompanyConversationsComponent } from './pages/conversations/conversations.component';
import { CompanyNotificationsComponent } from './pages/notifications/notifications.component';
import { CompanyPaymentsComponent } from './pages/company-payments/company-payments.component';
import { CompanySettingsComponent } from './pages/settings/settings.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      // MENU PRINCIPAL
      { path: 'home', component: CompanyHomeComponent },
      { path: 'dashboard', component: CompanyHomeComponent },
      { path: 'request-service', component: RequestServiceComponent },
      { path: 'vehicles-catalog', component: ExploreVehiclesComponent },
      { path: 'rent-vehicle', redirectTo: 'vehicles-catalog', pathMatch: 'full' },
      
      // REDIRECTS for simplification
      { path: 'vehicles', redirectTo: 'vehicles-catalog', pathMatch: 'full' },
      { path: 'driver-services', redirectTo: 'request-service', pathMatch: 'full' },
      
      { path: 'requests', component: CompanyRequestsComponent },

      // MES ACTIVITÉS
      { path: 'reservations', redirectTo: 'requests', pathMatch: 'full' },
      { path: 'contracts', redirectTo: 'requests', pathMatch: 'full' },
      { path: 'history', component: CompanyHistoryComponent },
      { path: 'reviews', component: CompanyReviewsComponent },

      // COMMUNICATION
      { path: 'conversations', component: CompanyConversationsComponent },
      { path: 'notifications', component: CompanyNotificationsComponent },

      // FINANCES
      { path: 'payments', component: CompanyPaymentsComponent },
      { path: 'invoices', redirectTo: 'payments', pathMatch: 'full' },
      { path: 'billing', component: BillingComponent },
      { path: 'reports', component: ReportsComponent },

      // COMPTE ENTREPRISE
      { path: 'profile', component: ProfileComponent },
      { path: 'settings', component: CompanySettingsComponent },
      { path: 'employees', component: EmployeesComponent },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CompanyRoutingModule { }
