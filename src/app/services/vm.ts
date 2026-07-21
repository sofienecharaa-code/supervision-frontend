import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VirtualMachine {
  id?: string;
  name: string;
  hostId: string;
  hostName: string;
  type: string;
  os: string;
  status: string;
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
  vcpuCount: number;
  ramAllocatedGb: number;
  externalId?: string;
}

@Service()
export class VmService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/vms';

  getVmsByHost(hostId: string): Observable<VirtualMachine[]> {
    return this.http.get<VirtualMachine[]>(`${this.apiUrl}/host/${hostId}`);
  }

  getAllVms(): Observable<VirtualMachine[]> {
    return this.http.get<VirtualMachine[]>(this.apiUrl);
  }

  powerAction(vmId: string, action: 'start' | 'stop'): Observable<string> {
    return this.http.post(`${this.apiUrl}/${vmId}/power?action=${action}`, {}, { responseType: 'text' });
  }
}