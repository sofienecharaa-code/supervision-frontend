import { Component, input, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-resource-chart',
  imports: [BaseChartDirective],
  templateUrl: './resource-chart.html',
  styleUrl: './resource-chart.css',
})
export class ResourceChart {
  label = input.required<string>();
  value = input.required<number>();

  chartData = computed<ChartData<'doughnut'>>(() => ({
    labels: [this.label(), 'Libre'],
    datasets: [
      {
        data: [this.value(), 100 - this.value()],
        backgroundColor: [this.colorFor(this.value()), '#1c2430'],
        borderWidth: 0,
      },
    ],
  }));

  chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    cutout: '70%',
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  private colorFor(value: number): string {
    if (value < 60) return '#34e2b0';
    if (value < 85) return '#f2a93c';
    return '#ef4b5f';
  }
}