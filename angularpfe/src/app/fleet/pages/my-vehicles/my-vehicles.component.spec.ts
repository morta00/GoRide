import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyVehiclesComponent } from './my-vehicles.component';

describe('MyVehiclesComponent', () => {
  let component: MyVehiclesComponent;
  let fixture: ComponentFixture<MyVehiclesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MyVehiclesComponent]
    });
    fixture = TestBed.createComponent(MyVehiclesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
