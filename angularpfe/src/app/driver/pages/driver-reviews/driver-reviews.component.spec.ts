import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverReviewsComponent } from './driver-reviews.component';

describe('DriverReviewsComponent', () => {
  let component: DriverReviewsComponent;
  let fixture: ComponentFixture<DriverReviewsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DriverReviewsComponent]
    });
    fixture = TestBed.createComponent(DriverReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
