import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioResponse, UpdateUserRequest, UpdateUserRolesRequest } from '../models/usuario.model';
import { API_URL } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private base = `${API_URL}/usuarios`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(this.base);
  }

  findById(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.base}/${id}`);
  }

  update(id: number, req: UpdateUserRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.base}/${id}`, req);
  }

  toggleActive(id: number): Observable<UsuarioResponse> {
    return this.http.patch<UsuarioResponse>(`${this.base}/${id}/activate`, {});
  }

  updateRoles(id: number, req: UpdateUserRolesRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.base}/${id}/roles`, req);
  }
}
