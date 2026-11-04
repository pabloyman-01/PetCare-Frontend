import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from './auth.service';
import { ClinicEstado, ManagedPlan, SaasAudit, SaasClinic, SaasPage } from '../models/saas.model';

@Injectable({ providedIn: 'root' })
export class SaasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/saas/clinicas`;

  list(q: string, page = 0, size = 20) {
    const params = new HttpParams().set('q', q.trim()).set('page', page).set('size', size);
    return this.http.get<SaasPage<SaasClinic>>(this.base, { params });
  }

  changePlan(id: number, plan: ManagedPlan, reason: string) {
    return this.http.patch<SaasClinic>(`${this.base}/${id}/plan`, { plan, reason: reason.trim() });
  }

  changeEstado(id: number, estado: ClinicEstado, reason: string) {
    return this.http.patch<SaasClinic>(`${this.base}/${id}/estado`, { estado, reason: reason.trim() });
  }

  audit(id: number, page = 0, size = 10) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<SaasPage<SaasAudit>>(`${this.base}/${id}/auditoria`, { params });
  }
}
