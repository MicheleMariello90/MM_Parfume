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
  weightG: number | string;
  dilution: string;
}

export interface Formula {
  id: string;
  name: string;
  ingredients: Ingredient[];
  date: string;
  tag: string;
  description?: string;      // Aggiunto per le note olfattive
  maturation_days?: number;  // Aggiunto per la maturazione (snake_case per Supabase)
  composition?: Record<string, number>;
}