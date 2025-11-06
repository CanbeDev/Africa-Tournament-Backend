// TypeScript types for team registration endpoint

export type PlayerPosition = 'GK' | 'DF' | 'MD' | 'AT';

export interface PlayerRatings {
  GK: number;
  DF: number;
  MD: number;
  AT: number;
}

export interface RegisterPlayerInput {
  name: string;
  position: PlayerPosition;
  isCaptain: boolean;
}

export interface RegisteredPlayer {
  name: string;
  naturalPosition: PlayerPosition;
  isCaptain: boolean;
  ratings: PlayerRatings;
}

export interface TeamRegistrationRequest {
  federation: string;
  country: string;
  manager: string;
  players: RegisterPlayerInput[];
}

export interface RegisteredTeam {
  id: string;
  federation: string;
  country: string;
  manager: string;
  rating: number;
  players: RegisteredPlayer[];
  createdAt: string;
}

export interface TeamRegistrationError {
  success: false;
  error: string;
  message?: string;
}

