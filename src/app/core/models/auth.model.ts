export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  telefono: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  telefono: string;
  active: boolean;
  roles: string[];
}

export interface AuthResponse {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserResponse;
}

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserResponse;
}
