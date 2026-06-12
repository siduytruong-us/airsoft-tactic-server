export interface OpeningHourDto {
  dayOfWeek: number;   // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime: string | null;   // "08:00" hoặc null
  closeTime: string | null;  // "18:00" hoặc null
  isClosed: boolean;
}

export interface GameModeResponseDto {
  id: string;
  name: string;
  description?: string;
  rules?: string[];
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
  openingHours?: OpeningHourDto[];
  phone?: string | null;
  website?: string | null;
  minAge?: number | null;
  entryFee?: number | null;
  entryFeeCurrency?: string;
  rentalAvailable?: string;
  isVerified: boolean;
}
