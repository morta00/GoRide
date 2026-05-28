import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderfooterComponent } from './headerfooter/headerfooter.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { ServicesComponent } from './services/services.component';
import { AboutComponent } from './about/about.component';
import { SignupComponent } from './signup/signup.component';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { JwtInterceptor } from './auth/jwt.interceptor';
import { FleetSetupComponent } from './fleet-setup/fleet-setup.component';
import { ContactComponent } from './contact/contact.component';
import { RoleSwitcherComponent } from './header/role-switcher/role-switcher.component';
import { ProfileAvatarComponent } from './header/profile-avatar/profile-avatar.component';
import { RoleSelectionComponent } from './role-selection/role-selection.component';
import { ProfileComponent } from './profile/profile.component';
import { DashboardRedirectComponent } from './dashboard-redirect.component';
import { AssistantWidgetComponent } from './components/assistant-widget/assistant-widget.component';
import { LogoComponent } from './shared/components/logo/logo.component';
import { LegacyResetRedirectComponent } from './legacy-reset-redirect.component';

@NgModule({
  declarations: [
    AppComponent,
    AssistantWidgetComponent,
    HeaderComponent,
    FooterComponent,
    HeaderfooterComponent,
    LoginComponent,
    HomeComponent,
    ServicesComponent,
    AboutComponent,
    SignupComponent,
    FleetSetupComponent,
    ContactComponent,
    RoleSwitcherComponent,
    RoleSelectionComponent,
    DashboardRedirectComponent,
    LegacyResetRedirectComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    TranslateModule.forRoot(),
    AppRoutingModule,
    ProfileAvatarComponent,
    ProfileComponent,
    LogoComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    ...provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    }),
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
