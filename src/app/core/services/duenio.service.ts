import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DuenioRequest, DuenioResponse } from '../models/duenio.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DuenioService {
  private base = `${API_URL}/duenios`;

  constructor(private http: HttpClient) {}

  create(req: DuenioRequest): Observable<DuenioResponse> {
    return this.http.post<DuenioResponse>(this.base, req);
  }

  findAll(search?: string, active?: boolean): Observable<DuenioResponse[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<DuenioResponse[]>(this.base, { params });
  }

  findById(id: number): Observable<DuenioResponse> {
    return this.http.get<DuenioResponse>(`${this.base}/${id}`);
  }

  findOwn(): Observable<DuenioResponse> {
    return this.http.get<DuenioResponse>(`${this.base}/me`);
  }

  update(id: number, req: DuenioRequest): Observable<DuenioResponse> {
    return this.http.put<DuenioResponse>(`${this.base}/${id}`, req);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
