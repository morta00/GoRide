import { Component, OnInit } from '@angular/core';

interface Vehicle {
  id: string;
  name: string;
  category: string;
  city: string;
  price: number;
  rating: number;
  transmission: string;
  fuel: string;
  seats: number;
  image?: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css']
})
export class MapViewComponent implements OnInit {

  vehicles: Vehicle[] = [
    { id: '1', name: 'Hyundai i20', category: 'Économique', city: 'Tunis Centre', price: 80, rating: 4.8, transmission: 'Automatique', fuel: 'Essence', seats: 5 },
    { id: '2', name: 'Renault Clio', category: 'Compacte', city: 'Ariana', price: 90, rating: 4.6, transmission: 'Manuelle', fuel: 'Essence', seats: 5 },
    { id: '3', name: 'Kia Sportage', category: 'SUV', city: 'La Marsa', price: 150, rating: 4.7, transmission: 'Automatique', fuel: 'Diesel', seats: 5 },
    { id: '4', name: 'BMW Série 3', category: 'Luxe', city: 'Lac 2', price: 250, rating: 4.9, transmission: 'Automatique', fuel: 'Essence', seats: 5 },
    { id: '5', name: 'Toyota Yaris', category: 'Économique', city: 'Tunis', price: 85, rating: 4.5, transmission: 'Automatique', fuel: 'Hybride', seats: 5 },
    { id: '6', name: 'Peugeot 208', category: 'Compacte', city: 'Sousse', price: 95, rating: 4.5, transmission: 'Automatique', fuel: 'Essence', seats: 5 }
  ];

  selectedVehicle: Vehicle | null = null;
  searchQuery = '';
  maxPrice = 500;
  selectedCategory = 'Toutes';

  constructor() { }

  get filteredVehicles(): Vehicle[] {
    let list = [...this.vehicles];
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      );
    }
    if (this.selectedCategory !== 'Toutes') {
      list = list.filter(v => v.category === this.selectedCategory);
    }
    list = list.filter(v => v.price <= this.maxPrice);
    return list;
  }

  ngOnInit(): void {
  }

  onSearch(): void {
    // filteredVehicles getter applies searchQuery
  }

  selectVehicle(vehicle: Vehicle): void {
    this.selectedVehicle = vehicle;
  }

  closePopup(): void {
    this.selectedVehicle = null;
  }

}
