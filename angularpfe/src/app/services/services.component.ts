import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  handleAction(roleRequired: string, targetRoute: string, signupRoute: string): void {
    if (this.isLoggedIn) {
      if (this.authService.hasRole(roleRequired)) {
        this.router.navigate([targetRoute]);
      } else {
        // Rediriger vers le profil pour ajouter le rôle manquant (Chemin correct)
        this.router.navigate(['/role-selection']);
      }
    } else {
      this.router.navigate([signupRoute]);
    }
  }
}

