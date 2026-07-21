import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetricHistoryEntry {
  id: string;
  hostId: string;
  hostName: string;
  timestamp: string;
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
}

@Service()
export class HistoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/history';

  getHistoryForHost(hostId: string): Observable<MetricHistoryEntry[]> {
    return this.http.get<MetricHistoryEntry[]>(`${this.apiUrl}/${hostId}`);
  }
}