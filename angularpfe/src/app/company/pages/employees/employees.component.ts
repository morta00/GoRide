import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css']
})
export class EmployeesComponent implements OnInit {
  employees: any[] = [];
  showModal = false;
  newEmployee = { name: '', email: '', department: '' };

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    const data = localStorage.getItem('goride_employees');
    if (data) {
      this.employees = JSON.parse(data);
    } else {
      this.employees = [
        { id: 1, name: 'Sami Ben Amor', email: 'sami.b@entreprise.tn', department: 'Marketing', budget: 120, status: 'Actif', avatar: 'assets/images/person_1.jpg' },
        { id: 2, name: 'Ines Khemiri', email: 'ines.k@entreprise.tn', department: 'Ventes', budget: 45, status: 'Actif', avatar: 'assets/images/person_2.jpg' }
      ];
      localStorage.setItem('goride_employees', JSON.stringify(this.employees));
    }
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  addEmployee(): void {
    if (this.newEmployee.name && this.newEmployee.email) {
      const collaborator = {
        id: Date.now(),
        ...this.newEmployee,
        budget: 0,
        status: 'Actif',
        avatar: 'assets/images/person_3.jpg'
      };
      this.employees.unshift(collaborator);
      localStorage.setItem('goride_employees', JSON.stringify(this.employees));
      this.newEmployee = { name: '', email: '', department: '' };
      this.showModal = false;
    }
  }

  deleteEmployee(id: number): void {
    if (confirm('Supprimer ce collaborateur ?')) {
      this.employees = this.employees.filter(e => e.id !== id);
      localStorage.setItem('goride_employees', JSON.stringify(this.employees));
    }
  }
}
