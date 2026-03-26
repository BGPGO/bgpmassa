export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export type UserRole = "SUPERADMIN" | "ADMIN" | "AGENT";

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
}
