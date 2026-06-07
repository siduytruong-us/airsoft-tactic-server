export interface UserResponseDto {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  isNewUser: boolean;
  createdAt: Date | null;
  lastSeenAt: Date | null;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserResponseDto;
}
