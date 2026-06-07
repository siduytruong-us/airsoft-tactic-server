export interface StatsResponseDto {
  userId: string;
  displayName?: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
  updatedAt?: string;
}

export interface UserResponseDto {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  isNewUser?: boolean;
  createdAt?: string;
  lastSeenAt?: string;
  stats?: StatsResponseDto;
}
