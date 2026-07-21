import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { HostService, Host } from '../../services/host';
import { VmService, VirtualMachine } from '../../services/vm';
import { ResourceChart } from '../resource-chart/resource-chart';
import { HistoryChart } from '../history-chart/history-chart';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface RamStatus {
  severity: 'safe' | 'medium' | 'high';
  source: string;
  value: number;
}

type SortField = 'name' | 'cpu' | 'ram' | 'status';

@Component({
  selector: 'app-dashboard',
  imports: [ResourceChart, FormsModule, HistoryChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private hostService = inject(HostService);
  private vmService = inject(VmService);
  authService = inject(AuthService);
  private pollingSubscription?: Subscription;

  private readonly MEDIUM_THRESHOLD = 50;
  private readonly HIGH_THRESHOLD = 80;

  hosts = signal<Host[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  expandedHostIds = signal<Set<string>>(new Set());
  expandedHistoryHostIds = signal<Set<string>>(new Set());
  vmsByHost = signal<Record<string, VirtualMachine[]>>({});
  vmsLoading = signal<string | null>(null);

  vmActionInProgress = signal<string | null>(null);
  vmActionMessage = signal<{ vmId: string; text: string; success: boolean } | null>(null);

  exportingPdf = signal<boolean>(false);

  searchTerm = signal<string>('');
  sortField = signal<SortField>('name');
  sortAscending = signal<boolean>(true);

  onlineCount = computed(() => this.hosts().filter(h => h.status === 'online').length);
  offlineCount = computed(() => this.hosts().filter(h => h.status !== 'online').length);

  totalHosts = computed(() => this.hosts().length);
  totalVms = computed(() => Object.values(this.vmsByHost()).flat().length);
  totalRunningVms = computed(() =>
    Object.values(this.vmsByHost()).flat().filter(vm => vm.status === 'running').length
  );
  avgCpuUsage = computed(() => {
    const onlineHosts = this.hosts().filter(h => h.status === 'online');
    if (onlineHosts.length === 0) return 0;
    const sum = onlineHosts.reduce((acc, h) => acc + h.cpuUsage, 0);
    return Math.round((sum / onlineHosts.length) * 10) / 10;
  });
  avgRamUsage = computed(() => {
    const onlineHosts = this.hosts().filter(h => h.status === 'online');
    if (onlineHosts.length === 0) return 0;
    const sum = onlineHosts.reduce((acc, h) => acc + h.ramUsage, 0);
    return Math.round((sum / onlineHosts.length) * 10) / 10;
  });

  filteredHosts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let result = this.hosts();

    if (term) {
      result = result.filter(h =>
        h.name.toLowerCase().includes(term) ||
        h.type.toLowerCase().includes(term) ||
        h.ipAddress.toLowerCase().includes(term)
      );
    }

    const field = this.sortField();
    const asc = this.sortAscending();
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'cpu': cmp = a.cpuUsage - b.cpuUsage; break;
        case 'ram': cmp = a.ramUsage - b.ramUsage; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return asc ? cmp : -cmp;
    });

    return result;
  });

  ramStatuses = computed<RamStatus[]>(() => {
    const statuses: RamStatus[] = [];

    for (const host of this.hosts()) {
      statuses.push(this.buildStatus(host.name, host.ramUsage));
    }

    const allVms = Object.values(this.vmsByHost()).flat();
    for (const vm of allVms) {
      if (vm.status !== 'running') continue;
      statuses.push(this.buildStatus(vm.name, vm.ramUsage));
    }

    const order = { high: 0, medium: 1, safe: 2 };
    return statuses.sort((a, b) => order[a.severity] - order[b.severity]);
  });

  highCount = computed(() => this.ramStatuses().filter(s => s.severity === 'high').length);
  mediumCount = computed(() => this.ramStatuses().filter(s => s.severity === 'medium').length);
  safeCount = computed(() => this.ramStatuses().filter(s => s.severity === 'safe').length);

  private buildStatus(source: string, value: number): RamStatus {
    if (value >= this.HIGH_THRESHOLD) {
      return { severity: 'high', source, value };
    }
    if (value >= this.MEDIUM_THRESHOLD) {
      return { severity: 'medium', source, value };
    }
    return { severity: 'safe', source, value };
  }

  ngOnInit(): void {
    this.loadHosts();

    this.pollingSubscription = interval(3000).subscribe(() => {
      this.loadHosts(true);

      for (const hostId of this.expandedHostIds()) {
        this.refreshVmsForHost(hostId, true);
      }
    });
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  loadHosts(silent: boolean = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.hostService.getHosts().subscribe({
      next: (data) => {
        this.hosts.set(data);
        this.loading.set(false);

        for (const host of data) {
          if (host.id) {
            this.refreshVmsForHost(host.id, true);
          }
        }
      },
      error: (err) => {
        this.error.set('Impossible de charger les hosts. Vérifie que le backend est démarré.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  toggleHost(hostId: string): void {
    this.expandedHostIds.update(current => {
      const next = new Set(current);
      if (next.has(hostId)) {
        next.delete(hostId);
      } else {
        next.add(hostId);
        this.refreshVmsForHost(hostId);
      }
      return next;
    });
  }

  toggleHistory(hostId: string): void {
    this.expandedHistoryHostIds.update(current => {
      const next = new Set(current);
      if (next.has(hostId)) {
        next.delete(hostId);
      } else {
        next.add(hostId);
      }
      return next;
    });
  }

  setSortField(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAscending.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAscending.set(true);
    }
  }

  performVmAction(vmId: string, action: 'start' | 'stop'): void {
    this.vmActionInProgress.set(vmId);
    this.vmActionMessage.set(null);

    this.vmService.powerAction(vmId, action).subscribe({
      next: () => {
        this.vmActionInProgress.set(null);
        this.vmActionMessage.set({ vmId, text: `Action "${action}" envoyée avec succès`, success: true });

        for (const [hostId, vms] of Object.entries(this.vmsByHost())) {
          if (vms.some(v => v.id === vmId)) {
            setTimeout(() => this.refreshVmsForHost(hostId, true), 2000);
            break;
          }
        }

        setTimeout(() => this.vmActionMessage.set(null), 5000);
      },
      error: (err) => {
        this.vmActionInProgress.set(null);
        const rawError: string = err.error || '';
        const errorText = rawError.includes('license') || rawError.includes('licence')
          ? 'Action refusée : licence ESXi gratuite ne permet pas cette opération'
          : (rawError || 'Erreur lors de l\'action');
        this.vmActionMessage.set({ vmId, text: errorText, success: false });
        setTimeout(() => this.vmActionMessage.set(null), 6000);
      }
    });
  }

  exportCsv(): void {
    const rows: string[] = [];
    rows.push('Type,Nom,Hote/Type,IP,Statut,CPU%,RAM%,Stockage%,vCPU,RAM Alloue (GB)');

    for (const host of this.hosts()) {
      rows.push(`Host,${host.name},${host.type},${host.ipAddress},${host.status},${host.cpuUsage},${host.ramUsage},${host.storageUsage},,`);

      const vms = this.vmsByHost()[host.id!] ?? [];
      for (const vm of vms) {
        rows.push(`${vm.type},${vm.name},${host.name},,${vm.status},${vm.cpuUsage},${vm.ramUsage},${vm.storageUsage},${vm.vcpuCount},${vm.ramAllocatedGb}`);
      }
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supervision-export-${this.formatDateForFilename()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportPdf(): Promise<void> {
    this.exportingPdf.set(true);

    const previouslyOpenHistory = new Set(this.expandedHistoryHostIds());
    const allHostIds = this.hosts().map(h => h.id!).filter(Boolean);
    this.expandedHistoryHostIds.set(new Set(allHostIds));

    await new Promise(resolve => setTimeout(resolve, 900));

    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      doc.text('Rapport de Supervision des Infrastructures', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 25);

      doc.setDrawColor(200);
      doc.line(14, 29, 196, 29);

      let currentY = 38;

      for (const host of this.hosts()) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(20, 20, 20);
        doc.text(`${host.name}`, 14, currentY);

        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`${host.type}  |  ${host.ipAddress}  |  Statut: ${host.status.toUpperCase()}`, 14, currentY + 5);

        currentY += 12;

        const chartElement = document.getElementById(`charts-${host.id}`);
        if (chartElement) {
          try {
            const canvas = await html2canvas(chartElement, {
              backgroundColor: '#10151d',
              scale: 2,
              useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 90;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;
            doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 8;
          } catch (e) {
            console.error('Erreur capture graphique:', e);
          }
        }

        const historyElement = document.getElementById(`history-${host.id}`);
        if (historyElement) {
          try {
            const historyCanvas = await html2canvas(historyElement, {
              backgroundColor: '#0a0e14',
              scale: 2,
            });
            const imgData = historyCanvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = (historyCanvas.height / historyCanvas.width) * imgWidth;

            if (currentY + imgHeight > 270) {
              doc.addPage();
              currentY = 20;
            }

            doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 8;
          } catch (e) {
            console.error('Erreur capture historique:', e);
          }
        }

        const vms = this.vmsByHost()[host.id!] ?? [];
        if (vms.length > 0) {
          autoTable(doc, {
            startY: currentY,
            head: [['VM / Container', 'Type', 'OS', 'Statut', 'vCPU', 'RAM (GB)', 'CPU %']],
            body: vms.map(vm => [vm.name, vm.type, vm.os, vm.status, vm.vcpuCount, vm.ramAllocatedGb, `${vm.cpuUsage}%`]),
            theme: 'striped',
            headStyles: { fillColor: [16, 21, 29] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });
          currentY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          currentY += 8;
        }
      }

      doc.save(`supervision-export-${this.formatDateForFilename()}.pdf`);
    } finally {
      this.expandedHistoryHostIds.set(previouslyOpenHistory);
      this.exportingPdf.set(false);
    }
  }

  private formatDateForFilename(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  private refreshVmsForHost(hostId: string, silent: boolean = false): void {
    if (!silent) {
      this.vmsLoading.set(hostId);
    }
    this.vmService.getVmsByHost(hostId).subscribe({
      next: (vms) => {
        this.vmsByHost.update(current => ({ ...current, [hostId]: vms }));
        if (!silent) {
          this.vmsLoading.set(null);
        }
      },
      error: (err) => {
        console.error(err);
        if (!silent) {
          this.vmsLoading.set(null);
        }
      }
    });
  }
}