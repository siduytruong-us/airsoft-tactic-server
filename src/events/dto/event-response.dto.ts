export interface EventResponseDto {
  id: string;
  title: string;
  description?: string;
  fieldId: string;
  fieldName: string;
  organizerId: string;
  organizerName: string;
  startTime: string;
  endTime: string;
  maxCapacity?: number;
  rsvpCount: number;
  status: string;
  isRsvped: boolean;
}
