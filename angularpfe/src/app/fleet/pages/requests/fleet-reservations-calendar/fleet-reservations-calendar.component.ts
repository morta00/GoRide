import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { RentalService } from '../../../../services/rental.service';

/** Palette de couleurs GoRide par statut */
const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  PENDING:   { bg: '#f59e0b', border: '#d97706' },  // 🟠 orange
  ACCEPTED:  { bg: '#10b981', border: '#059669' },  // 🟢 vert
  COMPLETED: { bg: '#3b82f6', border: '#2563eb' },  // 🔵 bleu
  REJECTED:  { bg: '#ef4444', border: '#dc2626' },  // 🔴 rouge
  CANCELLED: { bg: '#94a3b8', border: '#64748b' }   // ⚫ gris
};

@Component({
  selector: 'app-fleet-reservations-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './fleet-reservations-calendar.component.html',
  styleUrls: ['./fleet-reservations-calendar.component.css']
})
export class FleetReservationsCalendarComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';

  selectedEvent: any = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'fr',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: "Aujourd'hui",
      month: 'Mois',
      week: 'Semaine'
    },
    events: [],
    eventClick: this.onEventClick.bind(this),
    eventClassNames: () => ['fc-event-goride'],
    height: 'auto',
    aspectRatio: 1.8,
    dayMaxEvents: 3,
    moreLinkText: (n) => `+${n} autres`,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false }
  };

  /** Légende affichée dans le header */
  readonly legend = [
    { label: 'Confirmée',  color: STATUS_COLORS['ACCEPTED'].bg },
    { label: 'En attente', color: STATUS_COLORS['PENDING'].bg },
    { label: 'Refusée',    color: STATUS_COLORS['REJECTED'].bg },
    { label: 'Terminée',   color: STATUS_COLORS['COMPLETED'].bg },
    { label: 'Annulée',    color: STATUS_COLORS['CANCELLED'].bg }
  ];

  constructor(private rentalService: RentalService) {}

  ngOnInit(): void {
    this.fetchCalendarEvents();
  }

  ngOnDestroy(): void {
    this.selectedEvent = null;
  }

  allFcEvents: EventInput[] = [];
  availableVehicles: string[] = [];
  selectedVehicle: string = 'ALL';

  fetchCalendarEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('[Calendar] Début du chargement des réservations depuis API...');

    this.rentalService.getOwnerCalendar().subscribe({
      next: (eventsFromApi: any[]) => {
        console.log('[Calendar] Réservations reçues depuis API:', eventsFromApi);

        // Map API response to FullCalendar EventInput
        const fcEvents: EventInput[] = eventsFromApi.map(apiEvent => {
          const c = STATUS_COLORS[apiEvent.status] || STATUS_COLORS['PENDING'];
          return {
            id: String(apiEvent.reservationId),
            title: apiEvent.title,
            start: apiEvent.start,
            end: apiEvent.end,
            backgroundColor: apiEvent.color || c.bg,
            borderColor: c.border,
            extendedProps: {
              status: apiEvent.status,
              renter: apiEvent.renterName,
              vehicle: apiEvent.vehicleName,
              price: apiEvent.price
            }
          };
        });

        console.log('[Calendar] Événements transformés pour FullCalendar:', fcEvents);

        // Sauvegarder tous les événements pour le filtrage
        this.allFcEvents = fcEvents;

        // Extraire la liste unique des véhicules pour le menu déroulant
        const vehiclesSet = new Set<string>();
        eventsFromApi.forEach(e => {
          if (e.vehicleName) vehiclesSet.add(e.vehicleName);
        });
        this.availableVehicles = Array.from(vehiclesSet).sort();

        // Appliquer le filtre initial (Affiche TOUT)
        this.filterEvents();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Calendar] ERREUR HTTP EXACTE lors du chargement:', err);
        console.error('[Calendar] Status:', err.status, 'Message:', err.message, 'Error Body:', err.error);
        this.errorMessage = 'Impossible de charger le calendrier. Veuillez réessayer plus tard.';
        this.isLoading = false;
      }
    });
  }

  onVehicleFilterChange(event: any): void {
    this.selectedVehicle = event.target.value;
    this.filterEvents();
  }

  private filterEvents(): void {
    if (this.selectedVehicle === 'ALL') {
      this.calendarOptions = { ...this.calendarOptions, events: [...this.allFcEvents] };
    } else {
      const filtered = this.allFcEvents.filter(e => e.extendedProps?.['vehicle'] === this.selectedVehicle);
      this.calendarOptions = { ...this.calendarOptions, events: filtered };
    }
  }

  onEventClick(info: any): void {
    this.selectedEvent = {
      title:  info.event.title,
      start:  info.event.startStr,
      end:    info.event.endStr,
      ...info.event.extendedProps
    };
  }

  closePopup(): void {
    this.selectedEvent = null;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING:   'En attente',
      ACCEPTED:  'Confirmée',
      COMPLETED: 'Terminée',
      REJECTED:  'Refusée',
      CANCELLED: 'Annulée'
    };
    return labels[status?.toUpperCase()] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING:   'status-pending',
      ACCEPTED:  'status-accepted',
      COMPLETED: 'status-completed',
      REJECTED:  'status-rejected',
      CANCELLED: 'status-cancelled'
    };
    return map[status?.toUpperCase()] || '';
  }
}
