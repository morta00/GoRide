import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-company-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-5 text-center animate__animated animate__fadeIn">
      <div class="mb-4">
        <i class="ion-ios-construct text-primary" style="font-size: 80px;"></i>
      </div>
      <h2 class="fw-bold">Espace en cours de développement</h2>
      <p class="text-muted">Cette fonctionnalité sera bientôt disponible pour votre compte entreprise.</p>
      <button class="btn btn-primary rounded-pill px-4" (click)="goBack()">Retour au tableau de bord</button>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; display: flex; align-items: center; justify-content: center; }
  `]
})
export class CompanyPlaceholderComponent {
  goBack() { window.history.back(); }
}
