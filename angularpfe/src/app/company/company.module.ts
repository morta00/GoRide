import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CompanyRoutingModule } from './company-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { CompanyHomeComponent } from './pages/company-home/company-home.component';
import { RequestServiceComponent } from './pages/request-service/request-service.component';
import { CompanySettingsComponent } from './pages/settings/settings.component';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { ProfileComponent } from '../profile/profile.component';
import { FormsModule } from '@angular/forms';
import { LogoComponent } from '../shared/components/logo/logo.component';
import { VehicleCatalogModule } from '../shared/vehicle-catalog/vehicle-catalog.module';

@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    TopbarComponent
  ],
  imports: [
    CommonModule,
    CompanyRoutingModule,
    ProfileAvatarComponent,
    ProfileComponent,
    FormsModule,
    LogoComponent,
    VehicleCatalogModule,
    CompanyHomeComponent,
    CompanySettingsComponent,
    RequestServiceComponent
  ]
})
export class CompanyModule { }
