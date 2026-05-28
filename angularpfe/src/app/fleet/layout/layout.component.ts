import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) return;
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.authService.updateUser({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          city: profile.city,
          address: profile.address,
          photoUrl: profile.photoUrl
        });
      },
      error: () => { /* garde la session locale si l'API est indisponible */ }
    });
  }
}
