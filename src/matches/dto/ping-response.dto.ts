export interface PingResponseDto {
  id: string;
  matchId: string;
  userId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  pingType: string;
  createdAt: string;
  expiresAt: string;
}
