import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalorieTracker } from './calorie-tracker';

describe('CalorieTracker', () => {
  let component: CalorieTracker;
  let fixture: ComponentFixture<CalorieTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalorieTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalorieTracker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
