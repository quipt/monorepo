export interface Auth0JwtPayload {
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
  scp?: string[];
}
