export interface PlayerInTeamDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt?: string | null;
  killCount?: number | null;
  deathCount?: number | null;
}

export interface TeamDetailDto {
  id: string;
  name: string;
  colorHex: string;
  objectives?: string[] | null;
  respawnBase?: string | null;
  isWinner: boolean;
  players: PlayerInTeamDto[];
}

export interface MatchResponseDto {
  id: string;
  fieldId: string;
  fieldName: string;
  gameModeId: string;
  gameModeName: string;
  status: string;
  maxPlayers: number;
  playerCount: number;
  startedAt?: string | null;
  endedAt?: string | null;
  winningTeamId?: string | null;
  winningTeamName?: string | null;
  durationSeconds?: number | null;
  myTeamId?: string | null;
  canJoin: boolean;
  teams: TeamDetailDto[];
  result?: string | null;
}
