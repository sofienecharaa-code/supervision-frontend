import { TestBed } from '@angular/core/testing';

import { Host } from './host';

describe('Host', () => {
  let service: Host;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Host);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
