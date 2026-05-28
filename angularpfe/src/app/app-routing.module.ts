import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HeaderfooterComponent } from './headerfooter/headerfooter.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { ServicesComponent } from './services/services.component';
import { AboutComponent } from './about/about.component';
import { SignupComponent } from './signup/signup.component';
import { FleetSetupComponent } from './fleet-setup/fleet-setup.component';
import { ContactComponent } from './contact/contact.component';
import { AuthGuard } from './auth/auth.guard';

import { RoleSelectionComponent } from './role-selection/role-selection.component';
import { DashboardRedirectComponent } from './dashboard-redirect.component';
import { ProfileComponent } from './profile/profile.component';
import { LegacyResetRedirectComponent } from './legacy-reset-redirect.component';

const routes: Routes = [
  { path: 'role-selection', component: RoleSelectionComponent, canActivate: [AuthGuard] },
  
  { 
    path: 'dashboard/profile', 
    canActivate: [AuthGuard], 
    component: ProfileComponent 
  },

  { path: 'reset-password', component: LoginComponent },
  { path: 'reset-password/:token', component: LoginComponent },
  { path: 'login/reset/:token', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  // Legacy email links (old backend used /r?token=)
  { path: 'r', component: LegacyResetRedirectComponent },

  { path: 'signup', component: SignupComponent },
  { path: 'signup/driver', component: SignupComponent, data: { role: 'DRIVER' } },
  { path: 'signup/fleet', component: SignupComponent, data: { role: 'FLEET_OWNER' } },
  { path: 'signup/company', component: SignupComponent, data: { role: 'COMPANY' } },
  
  {
     path: 'acceuil',
     component: HeaderfooterComponent,
     children: [
       { path: '', component: HomeComponent },
       { path: 'services', component: ServicesComponent },
       { path: 'about', component: AboutComponent },
       { path: 'contact', component: ContactComponent },
     ]
   },

   { path: 'fleet/setup', component: FleetSetupComponent },
   { path: 'client', loadChildren: () => import('./client/client.module').then(m => m.ClientModule), canActivate: [AuthGuard], data: { roles: ['ROLE_CLIENT', 'ROLE_USER'] } },
   { path: 'driver', loadChildren: () => import('./driver/driver.module').then(m => m.DriverModule), canActivate: [AuthGuard], data: { role: 'ROLE_DRIVER' } },
   { path: 'fleet', loadChildren: () => import('./fleet/fleet.module').then(m => m.FleetModule), canActivate: [AuthGuard], data: { role: 'ROLE_FLEET_OWNER' } },
   { path: 'owner', loadChildren: () => import('./fleet/fleet.module').then(m => m.FleetModule), canActivate: [AuthGuard], data: { role: 'ROLE_FLEET_OWNER' } },
   { path: 'company', loadChildren: () => import('./company/company.module').then(m => m.CompanyModule), canActivate: [AuthGuard], data: { role: 'ROLE_COMPANY' } },
   { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule), canActivate: [AuthGuard], data: { role: 'ROLE_ADMIN' } },
   
   { path: '', redirectTo: 'acceuil', pathMatch: 'full' },
   { path: '**', redirectTo: 'acceuil' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
