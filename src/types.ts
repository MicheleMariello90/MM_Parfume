export const DILUTION_MAP = {
  '100%': 1,
  '50%': 0.5,
  '20%': 0.2,
  '10%': 0.1,
  '5%': 0.05,
  '1%': 0.01,
  '0.1%': 0.001 // Utile per Amber Xtreme o Ambrocenide
} as const;

export interface Ingredient {
  id: string;
  materialName: string;
  dilution: keyof typeof DILUTION_MAP; // Vincola la scelta ai valori della mappa
  weightG: number; // Meglio forzare number per i calcoli
  costPerGram?: number; 
}

export interface Formula {
  id: string;
  name: string;
  ingredients: Ingredient[];
  date: string;
  tag: string;
  // Campi Maturazione
  maturationDays?: number;
  startDate?: string; 
  isCompleted?: boolean;
}