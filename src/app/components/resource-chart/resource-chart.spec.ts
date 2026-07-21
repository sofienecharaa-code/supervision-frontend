import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceChart } from './resource-chart';

describe('ResourceChart', () => {
  let component: ResourceChart;
  let fixture: ComponentFixture<ResourceChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceChart],
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
