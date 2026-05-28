import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { DriverProfileService } from '../../services/driver-profile.service';
import { DriverService } from '../../services/driver.service';
import { Ride, RideRequest, DriverProfile } from '../../models/driver.models';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit, AfterViewInit {
  profile: any = null;
  recentRides: any[] = [];
  pendingRequests: any[] = [];
  recentReviews: any[] = [];
  stats = { todayEarnings: 0, rating: 0, pendingRequests: 0, onlineHours: '0h', monthlyTrips: 0 };
  
  isOnline: boolean = false;
  incomingRide: any = null;
  isWeeklyActivityEmpty: boolean = true;

  // Chart Configuration
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, 0],
      label: 'Revenus (DT)',
      fill: true,
      tension: 0.4,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#3b82f6'
    }]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false } },
      x: { grid: { display: false }, border: { display: false } }
    }
  };
  public lineChartType: any = 'line';

  private map: L.Map | undefined;

  constructor(
    private http: HttpClient,
    private driverProfileService: DriverProfileService,
    private driverService: DriverService
  ) {}

  ngOnInit(): void {
    this.isOnline = this.driverService.getOnlineStatus();
    this.driverService.isOnline$.subscribe(status => {
      this.isOnline = status;
      if (!status) {
        this.incomingRide = null;
      }
    });
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // 1. Load real profile
    this.driverProfileService.getProfile().subscribe({
      next: (p) => this.profile = p,
      error: (err) => console.error('Error loading driver profile:', err)
    });

    // 2. Load dashboard stats & recent rides & weekly chart
    this.http.get<any>('http://localhost:8081/api/driver/dashboard').subscribe({
      next: (res) => {
        if (res) {
          this.stats = {
            todayEarnings: res.todayRevenue || 0,
            rating: res.averageRating || 0,
            pendingRequests: res.pendingRequests || 0,
            onlineHours: '0h',
            monthlyTrips: res.monthlyTrips || 0
          };

          this.recentRides = (res.recentTrips || []).map((t: any) => ({
            id: t.id,
            date: t.date,
            to: t.to,
            amount: t.amount,
            status: t.status
          }));

          const labels = (res.weeklyActivity || []).map((day: any) => day.label);
          const data = (res.weeklyActivity || []).map((day: any) => day.value);
          const maxVal = data.reduce((a: number, b: number) => Math.max(a, b), 0);
          this.isWeeklyActivityEmpty = maxVal === 0;

          this.lineChartData = {
            labels: labels,
            datasets: [{
              data: data,
              label: 'Revenus (DT)',
              fill: true,
              tension: 0.4,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointHoverBackgroundColor: '#3b82f6',
              pointHoverBorderColor: '#ffffff'
            }]
          };
        }
      },
      error: (err) => console.error('Error loading driver dashboard:', err)
    });

    // 3. Load pending requests details
    this.http.get<any[]>('http://localhost:8081/api/rides/requests/driver/pending').subscribe({
      next: (reqs) => {
        this.pendingRequests = (reqs || []).map((req: any) => ({
          id: String(req.id),
          passengerName: req.passengerName || 'Client GoRide',
          passengerAvatar: req.passengerAvatar || '',
          passengerRating: req.passengerRating || 5.0,
          from: req.from || req.departure || '',
          to: req.to || req.destination || '',
          estimatedPrice: req.estimatedPrice || req.estimatedAmount || 0,
          estimatedDuration: req.estimatedDuration || '15 min',
          paymentMethod: 'cash'
        }));
      },
      error: (err) => console.error('Error loading pending driver requests:', err)
    });

    // 4. Load recent reviews
    this.recentReviews = [];
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 300);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'en_attente': 'En attente', 'acceptee': 'Acceptée',
      'en_cours': 'En cours', 'terminee': 'Terminée', 'annulee': 'Annulée'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'en_attente': 'status-en-attente', 'acceptee': 'status-en-cours',
      'en_cours': 'status-en-cours', 'terminee': 'status-terminé', 'annulee': 'status-annulé'
    };
    return map[status] || '';
  }

  toggleOnline(): void {
    this.driverService.toggleOnlineStatus().subscribe(online => {
      if (online) {
        setTimeout(() => {
          if (this.driverService.getOnlineStatus()) {
            this.simulateRideRequest();
          }
        }, 5000);
      }
    });
  }

  simulateRideRequest(): void {
    this.incomingRide = {
      id: Math.floor(Math.random() * 1000),
      client: 'Sami B.',
      from: 'Lac 1',
      to: 'Centre Urbain Nord',
      price: 14.5,
      distance: '6.2 km'
    };
  }

  acceptRide(): void {
    alert('Course acceptée ! Naviguez vers le point de départ.');
    this.incomingRide = null;
    this.stats.todayEarnings += 14.5;
  }

  rejectRide(): void {
    this.incomingRide = null;
    setTimeout(() => {
      if (this.isOnline) this.simulateRideRequest();
    }, 10000);
  }

  acceptRequest(requestId: string): void {
    const id = Number(requestId);
    this.http.put(`http://localhost:8081/api/rides/requests/${id}/accept`, {}).subscribe({
      next: () => {
        alert('Course acceptée !');
        this.loadDashboardData();
      },
      error: (err: any) => alert("Erreur lors de l'acceptation: " + (err.error?.message || err.message))
    });
  }

  declineRequest(requestId: string): void {
    const id = Number(requestId);
    this.http.put(`http://localhost:8081/api/rides/requests/${id}/reject`, {}).subscribe({
      next: () => {
        alert('Course refusée.');
        this.loadDashboardData();
      },
      error: (err: any) => alert("Erreur lors du refus: " + (err.error?.message || err.message))
    });
  }

  private initMap(): void {
    const mapContainer = document.getElementById('driver-map');
    if (!mapContainer) return;

    this.map = L.map('driver-map', {
      center: [36.8065, 10.1815],
      zoom: 13,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OSM contributors &copy; CARTO'
    }).addTo(this.map);

    const driverIcon = L.divIcon({
      className: 'custom-div-icon',
      html: "<div style='background-color:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3);'></div>",
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([36.8065, 10.1815], { icon: driverIcon }).addTo(this.map);
  }
}
