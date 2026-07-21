import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Host {
  id?: string;
  name: string;
  type: string;       // "VMware" ou "Proxmox"
  ipAddress: string;
  status: string;      // "online", "offline", "error"
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
}

@Service()
export class HostService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/hosts';

  getHosts(): Observable<Host[]> {
    return this.http.get<Host[]>(this.apiUrl);
  }

  createHost(host: Host): Observable<Host> {
    return this.http.post<Host>(this.apiUrl, host);
  }
}