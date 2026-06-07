export interface AdminInfoDto {
  id: string;
  username: string;
  displayName: string;
}

export interface AdminLoginResponseDto {
  accessToken: string;
  expiresIn: number;
  admin: AdminInfoDto;
}
