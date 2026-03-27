export const DILUTION_MAP: Record<string, number> = {
  '100%': 1,
  '50%': 0.5,
  '20%': 0.2,
  '10%': 0.1,
  '5%': 0.05,
  '1%': 0.01,
  '0.1%': 0.001
};

// Limiti IFRA Cat. 4 (Profumeria) - Semplificati per il calcolo
export const IFRA_LIMITS: Record<string, number> = {
  "CUMARINA": 1.5,
  "CITRAL": 0.6,        // Limite accumulato di Citrale
  "EUGENOL": 2.5,       // Eugenolo
  "CINNAMAL": 0.25,     // Cinnamale
  "OAKMOSS": 0.1,       // Muschio di Quercia
  "GERANIOL": 5.3,      // Geraniolo
  "BENZYL BENZOATE": 4.8  
};


export const FAMILY_COLORS: Record<string, string> = {
    "AGRUMATO": "#C3f53b",
    "AMBRATO": "#AB4502",
    "ANIMALICO": "#8B4513",
    "AROMATICO": "#2B5936",
    "BALSAMICO": "#6b2818",
    "CARAMELLO": "#CD853F",
    "CREMOSO": "#F5D678",
    "CIPRIATO": "#F5D789",
    "CUOIO": "#2e0e06",
    "LEGNOSO": "#381F0F",
    "MARINO": "#07108C",
    "FRUTTATO": "#FF2C00",
    "FLOREALE": "#B52F4A",
    "FLOREALE BIANCO": "#EDD5D8",
    "GOURMAND": "#c5c0c0",
    "FUMOSO": "#383737" , 
    "SALATO": "#F0F0F5",
    "SPEZIATO CALDO": "#822312",
    "SPEZIATO FRESCO": "#31A617",
    "ERBACEO": "#51824F",
    "FRESCO": "#91B5B5",
    "MUSCHIATO": "#D598FA",
    "VANIGLIATO": "#F5D793",
    "DOLCE": "#A82308",
    "RUM": "#591204",
    "ROSA": "#FC1729",
    "PATCHOULI": "#473F0C",
    "TROPICALE": "#E39102",
    "TERROSO": "#362C0A",
    "LATTONICO": "#EDE9E1",
    "OUD": "#302B17",
    "VERDE": "#0E9C09",
    "MELA": "#76E317",
    "MIELATO": "#F5AF00",
    "OZONICO": "#1DC4C4",
    "CIOCCOLATO": "#633D0D",
    "ACQUATICO": "#4061D6",
    "VIOLETTA": "#75014C",
    "CAFFE": "#593501",
    "DA DEFINIRE": "#383737"
};