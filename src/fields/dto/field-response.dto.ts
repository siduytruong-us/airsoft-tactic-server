export interface GameModeResponseDto {
  id: string;
  name: string;
  description?: string;
  rules?: string[];
  maxPlayers: number;
  teamCount: number;
  respawnEnabled: boolean;
  respawnDelaySeconds: number;
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  colorHex?: string;
  playerCount: number;
}

export interface MatchSummaryDto {
  id: string;
  status: string;
  gameModeName: string;
  playerCount: number;
  maxPlayers: number;
  teams?: TeamSummaryDto[];
}

export interface FieldResponseDto {
  id: string;
  name: string;
  location?: string;
  lat?: number;
  lng?: number;
  coverImageUrl?: string;
  description?: string;
  isLive: boolean;
  activeMatchId?: string;
  gameModes?: GameModeResponseDto[];
  currentGame?: MatchSummaryDto;
}
