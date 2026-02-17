import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeightLog } from './weight-log';

describe('WeightLog', () => {
  let component: WeightLog;
  let fixture: ComponentFixture<WeightLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeightLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeightLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
