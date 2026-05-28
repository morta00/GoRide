import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExploreVehiclesComponent } from '../../client/pages/explore-vehicles/explore-vehicles.component';
import { AiInsightPanelComponent } from '../../components/ai-insight-panel/ai-insight-panel.component';

/** Catalogue location partagé (client + entreprise). */
@NgModule({
  declarations: [ExploreVehiclesComponent],
  imports: [CommonModule, FormsModule, AiInsightPanelComponent],
  exports: [ExploreVehiclesComponent]
})
export class VehicleCatalogModule {}
