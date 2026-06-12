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

export interface GameModeDetailDto {
  id: string;
  name: string;
  description?: string | null;
  rules?: string[] | null;
}

export interface MapSummaryDto {
  id: string;
  name: string;
  coverImageUrl?: string | null;
}

export interface MatchResponseDto {
  id: string;
  fieldId: string;
  fieldName: string;
  status: string;
  maxPlayers: number;
  teamCount: number;
  respawnEnabled: boolean;
  respawnDelaySeconds: number;
  scheduledEndAt: string | null;
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
  gameMode: GameModeDetailDto | null;
  map: MapSummaryDto | null;
}
