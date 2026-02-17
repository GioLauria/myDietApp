import { TestBed } from '@angular/core/testing';

import { Diet } from './diet';

describe('Diet', () => {
  let service: Diet;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Diet);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
