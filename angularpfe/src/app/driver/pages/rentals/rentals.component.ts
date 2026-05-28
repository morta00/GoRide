import { Component } from '@angular/core';

@Component({
  selector: 'app-rentals',
  template: `
    <div class="content-card">
      <div class="card-header-flex">
        <h3>Rentals</h3>
      </div>
      <div class="p-5 text-center text-muted">
        <span class="ion-ios-construct mb-3" style="font-size: 3rem; display: block;"></span>
        <h4>Page en cours de développement</h4>
        <p>Cette fonctionnalité sera bientôt disponible pour les chauffeurs partenaires.</p>
        <button class="btn btn-primary mt-3" routerLink="/driver/dashboard">Retour au tableau de bord</button>
      </div>
    </div>
  `,
  styles: [`
    .content-card {
      background: white;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
      border: 1px solid #f1f5f9;
    }
    .card-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h3 {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }
  `]
})
export class RentalsComponent {}
