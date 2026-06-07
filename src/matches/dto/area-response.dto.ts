export interface AreaResponseDto {
  id: string;
  matchId: string;
  name: string;
  description?: string | null;
  colorHex?: string;
  areaType?: string;
  geometry: object;
  createdAt: string;
}
