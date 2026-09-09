import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Clinica, ClinicaRequest, ClinicaPublic, ServicioPublic } from '../models/clinica.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClinicaService {
  private base = `${API_URL}/clinicas`;
  private publicBase = `${API_URL}/public/clinicas`;

  constructor(private http: HttpClient) {}

  getMyClinic(): Observable<Clinica> {
    return this.http.get<Clinica>(`${this.base}/me`);
  }

  updateMyClinic(req: ClinicaRequest): Observable<Clinica> {
    return this.http.put<Clinica>(`${this.base}/me`, req);
  }

  getPublicClinic(slug: string): Observable<ClinicaPublic> {
    return this.http.get<ClinicaPublic>(`${this.publicBase}/${slug}`);
  }

  getPublicServices(slug: string): Observable<ServicioPublic[]> {
    return this.http.get<ServicioPublic[]>(`${this.publicBase}/${slug}/servicios`);
  }
}