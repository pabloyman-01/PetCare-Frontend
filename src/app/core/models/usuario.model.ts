export interface UsuarioResponse {
  id: number;
  fullName: string;
  email: string;
  active: boolean;
  roles: string[];
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}
