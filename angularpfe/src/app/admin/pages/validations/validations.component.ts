import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-validations',
  templateUrl: './validations.component.html',
  styleUrls: ['./validations.component.css']
})
export class ValidationsComponent implements OnInit {
  validations: any[] = [];
  filteredValidations: any[] = [];
  currentFilter: string = 'ALL';

  stats = {
    pendingTotal: 0,
    accounts: 0,
    documents: 0,
    vehicles: 0,
    validated: 0,
    rejected: 0
  };

  selectedItem: any = null;
  isDetailsModalOpen: boolean = false;
  isRejectModalOpen: boolean = false;
  isValidateConfirmOpen: boolean = false;
  rejectionReason: string = '';
  rejectionError: string = '';

  ngOnInit(): void {
    this.initData();
    this.calculateStats();
    this.applyFilter('ALL');
  }

  initData(): void {
    const saved = localStorage.getItem('admin_validations_list');
    if (saved) {
      this.validations = JSON.parse(saved);
    } else {
      this.validations = [
        { id: 1, type: 'DRIVER_ACCOUNT', entityName: 'Mohamed Ali', email: 'mohamed@gmail.com', date: '12/05/2026', status: 'PENDING', priority: 'Haute', details: 'Nouveau chauffeur inscrit à Bizerte.' },
        { id: 2, type: 'OWNER_VEHICLE', entityName: 'Kia Rio', subEntity: 'TN 540', date: '13/05/2026', status: 'PENDING', priority: 'Moyenne', details: 'Ajout de véhicule Kia Rio (TN 540).' },
        { id: 3, type: 'COMPANY_DOCUMENT', entityName: 'Tech Solutions SARL', email: 'contact@techsolutions.tn', date: '14/05/2026', status: 'PENDING', priority: 'Haute', details: 'Mise à jour du registre de commerce.' },
        { id: 4, type: 'DRIVER_DOCUMENT', entityName: 'Ahmed Ben Ali', email: 'ahmed@gmail.com', subEntity: 'Permis de conduire', date: '14/05/2026', status: 'PENDING', priority: 'Haute', details: 'Nouveau permis scanné.' },
        { id: 5, type: 'OWNER_ACCOUNT', entityName: 'Karim Mansour', email: 'karim@gmail.com', date: '10/05/2026', status: 'APPROVED', priority: 'Moyenne', details: 'Compte propriétaire validé.' },
        { id: 6, type: 'DRIVER_VEHICLE', entityName: 'Renault Symbol', subEntity: 'TN 221', date: '11/05/2026', status: 'REJECTED', priority: 'Basse', details: 'Photo carte grise illisible.', reason: 'Photo de la carte grise floue.' }
      ];
      this.saveData();
    }
  }

  saveData(): void {
    localStorage.setItem('admin_validations_list', JSON.stringify(this.validations));
    this.calculateStats();
  }

  calculateStats(): void {
    const pending = this.validations.filter(v => v.status === 'PENDING');
    this.stats = {
      pendingTotal: pending.length,
      accounts: pending.filter(v => v.type.includes('ACCOUNT')).length,
      documents: pending.filter(v => v.type.includes('DOCUMENT')).length,
      vehicles: pending.filter(v => v.type.includes('VEHICLE')).length,
      validated: this.validations.filter(v => v.status === 'APPROVED').length,
      rejected: this.validations.filter(v => v.status === 'REJECTED').length
    };
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;
    let filtered = [...this.validations];

    if (filter === 'ACCOUNTS') {
      filtered = filtered.filter(v => v.type.includes('ACCOUNT'));
    } else if (filter === 'DOCUMENTS') {
      filtered = filtered.filter(v => v.type.includes('DOCUMENT'));
    } else if (filter === 'VEHICLES') {
      filtered = filtered.filter(v => v.type.includes('VEHICLE'));
    } else if (filter === 'DRIVER') {
      filtered = filtered.filter(v => v.type.includes('DRIVER'));
    } else if (filter === 'OWNER') {
      filtered = filtered.filter(v => v.type.includes('OWNER'));
    } else if (filter === 'COMPANY') {
      filtered = filtered.filter(v => v.type.includes('COMPANY'));
    }

    this.filteredValidations = filtered;
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      'DRIVER_ACCOUNT': 'Compte chauffeur',
      'OWNER_ACCOUNT': 'Compte propriétaire',
      'COMPANY_ACCOUNT': 'Compte entreprise',
      'DRIVER_DOCUMENT': 'Document chauffeur',
      'OWNER_DOCUMENT': 'Document propriétaire',
      'COMPANY_DOCUMENT': 'Document entreprise',
      'OWNER_VEHICLE': 'Véhicule propriétaire',
      'DRIVER_VEHICLE': 'Véhicule chauffeur'
    };
    return labels[type] || type;
  }

  getCategory(type: string): string {
    if (type.includes('ACCOUNT')) return 'Compte';
    if (type.includes('DOCUMENT')) return 'Document';
    if (type.includes('VEHICLE')) return 'Véhicule';
    return 'Autre';
  }

  openDetails(item: any): void {
    this.selectedItem = item;
    this.isDetailsModalOpen = true;
  }

  closeDetails(): void {
    this.isDetailsModalOpen = false;
  }

  openValidateConfirm(item: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedItem = item;
    this.isValidateConfirmOpen = true;
  }

  closeValidateConfirm(): void {
    this.isValidateConfirmOpen = false;
  }

  confirmValidation(): void {
    if (!this.selectedItem) return;
    this.selectedItem.status = 'APPROVED';
    this.syncWithEntity(this.selectedItem, 'VERIFIED');
    this.addActivity(`Validation approuvée`, `${this.getTypeLabel(this.selectedItem.type)} - ${this.selectedItem.entityName}`);
    this.saveData();
    this.applyFilter(this.currentFilter);
    this.closeValidateConfirm();
    this.closeDetails();
  }

  openRejectModal(item: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedItem = item;
    this.rejectionReason = '';
    this.rejectionError = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
  }

  confirmReject(): void {
    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'Le motif du refus est obligatoire.';
      return;
    }
    this.selectedItem.status = 'REJECTED';
    this.selectedItem.reason = this.rejectionReason;
    this.syncWithEntity(this.selectedItem, 'REJECTED');
    this.addActivity(`Validation refusée`, `${this.getTypeLabel(this.selectedItem.type)} - ${this.selectedItem.entityName}`);
    this.saveData();
    this.applyFilter(this.currentFilter);
    this.closeRejectModal();
    this.closeDetails();
  }

  private syncWithEntity(item: any, status: string): void {
    // Sync with users
    if (item.type.includes('ACCOUNT') || item.type.includes('DOCUMENT')) {
      const usersList = JSON.parse(localStorage.getItem('admin_users_list') || '[]');
      const user = usersList.find((u: any) => u.email === item.email || u.name === item.entityName);
      if (user) {
        user.verificationStatus = status;
        if (status === 'VERIFIED') {
          user.status = 'ACTIVE';
        } else if (status === 'REJECTED') {
          user.rejectionReason = item.reason;
        }
        localStorage.setItem('admin_users_list', JSON.stringify(usersList));
      }
    }
    // Sync with vehicles
    if (item.type.includes('VEHICLE')) {
      const vehiclesList = JSON.parse(localStorage.getItem('admin_vehicles') || '[]');
      const vehicle = vehiclesList.find((v: any) => v.plateNumber === item.subEntity || v.entityName === item.entityName || v.brand + ' ' + v.model === item.entityName);
      if (vehicle) {
        vehicle.validationStatus = status === 'VERIFIED' ? 'APPROVED' : 'REJECTED';
        if (status === 'REJECTED') vehicle.rejectionReason = item.reason;
        localStorage.setItem('admin_vehicles', JSON.stringify(vehiclesList));
      }
    }
  }

  private addActivity(title: string, desc: string): void {
    const activities = JSON.parse(localStorage.getItem('admin_activity') || '[]');
    activities.unshift({
      id: Date.now(),
      icon: 'ion-ios-checkmark-circle',
      title: title,
      desc: desc,
      time: 'À l\'instant'
    });
    localStorage.setItem('admin_activity', JSON.stringify(activities.slice(0, 10)));
  }
}
