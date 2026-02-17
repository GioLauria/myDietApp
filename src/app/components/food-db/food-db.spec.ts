import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoodDb } from './food-db';

describe('FoodDb', () => {
  let component: FoodDb;
  let fixture: ComponentFixture<FoodDb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodDb]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FoodDb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
