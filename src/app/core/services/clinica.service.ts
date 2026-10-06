import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Clinica, ClinicaPlan, ClinicaRequest, ClinicaPublic, ServicioPublic, ClinicDirectoryPage } from '../models/clinica.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClinicaService {
  private base = `${API_URL}/clinicas`;
  private publicBase = `${API_URL}/public/clinicas`;

  constructor(private http: HttpClient) {}

  getMyClinic(): Observable<Clinica> {
    return this.http.get<Clinica>(`${this.base}/me`);
  }

  getMyPlan(): Observable<ClinicaPlan> {
    return this.http.get<ClinicaPlan>(`${this.base}/me/plan`);
  }

  updateMyClinic(req: ClinicaRequest): Observable<Clinica> {
    return this.http.put<Clinica>(`${this.base}/me`, req);
  }

  getPublicClinic(slug: string): Observable<ClinicaPublic> {
    return this.http.get<ClinicaPublic>(`${this.publicBase}/${slug}`);
  }

  getDirectory(query: string, page: number): Observable<ClinicDirectoryPage> {
    const params = new HttpParams().set('q', query).set('page', page).set('size', 12);
    return this.http.get<ClinicDirectoryPage>(this.publicBase, { params });
  }

  getPublicServices(slug: string): Observable<ServicioPublic[]> {
    return this.http.get<ServicioPublic[]>(`${this.publicBase}/${slug}/servicios`);
  }
}
