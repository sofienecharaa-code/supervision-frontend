import { Component, input, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { HistoryService, MetricHistoryEntry } from '../../services/history';

@Component({
  selector: 'app-history-chart',
  imports: [BaseChartDirective],
  templateUrl: './history-chart.html',
  styleUrl: './history-chart.css',
})
export class HistoryChart implements OnInit, OnChanges {
  private historyService = inject(HistoryService);

  hostId = input.required<string>();

  loading = signal<boolean>(true);
  hasData = signal<boolean>(false);
  latestEntry = signal<MetricHistoryEntry | null>(null);

  chartData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 5,
        hoverBorderWidth: 2,
      },
      line: {
        borderWidth: 2,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#5d6b7d',
          font: { size: 10 },
          callback: (value) => value + '%',
          stepSize: 25,
        },
        grid: {
          color: 'rgba(28, 36, 48, 0.6)',
        },
        border: { display: false },
      },
      x: {
        ticks: {
          color: '#5d6b7d',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
        grid: { display: false },
        border: { color: '#1c2430' },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#e8edf4',
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6,
          boxHeight: 6,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#10151d',
        titleColor: '#f4f7fb',
        bodyColor: '#e8edf4',
        borderColor: '#1c2430',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 11 },
        boxPadding: 4,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
        },
      },
    },
  };

  ngOnInit(): void {
    this.loadHistory();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hostId'] && !changes['hostId'].firstChange) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.historyService.getHistoryForHost(this.hostId()).subscribe({
      next: (entries) => {
        this.updateChart(entries);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur historique:', err);
        this.loading.set(false);
      },
    });
  }

  private updateChart(entries: MetricHistoryEntry[]): void {
    this.hasData.set(entries.length > 1);
    this.latestEntry.set(entries.length > 0 ? entries[entries.length - 1] : null);

    const labels = entries.map(e => {
      const date = new Date(e.timestamp);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    });

    this.chartData.set({
      labels,
      datasets: [
        {
          label: 'CPU',
          data: entries.map(e => e.cpuUsage),
          borderColor: '#4f8cff',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(79, 140, 255, 0.08)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(79, 140, 255, 0.25)');
            gradient.addColorStop(1, 'rgba(79, 140, 255, 0)');
            return gradient;
          },
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#4f8cff',
          pointBorderColor: '#0a0e14',
        },
        {
          label: 'RAM',
          data: entries.map(e => e.ramUsage),
          borderColor: '#34e2b0',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(52, 226, 176, 0.08)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(52, 226, 176, 0.25)');
            gradient.addColorStop(1, 'rgba(52, 226, 176, 0)');
            return gradient;
          },
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#34e2b0',
          pointBorderColor: '#0a0e14',
        },
        {
          label: 'Stockage',
          data: entries.map(e => e.storageUsage),
          borderColor: '#f2a93c',
          backgroundColor: 'transparent',
          tension: 0.35,
          fill: false,
          borderDash: [4, 3],
          pointBackgroundColor: '#f2a93c',
          pointBorderColor: '#0a0e14',
        },
      ],
    });
  }
}