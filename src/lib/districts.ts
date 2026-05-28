export interface DistrictInfo {
  id: string;
  name: string;
  description: string;
  averageRent: number; // Avg €/m² warm
}

export const MUNICH_DISTRICTS: Record<string, DistrictInfo> = {
  "maxvorstadt": {
    id: "maxvorstadt",
    name: "Maxvorstadt",
    description: "Academic & museum quarter, highly central and popular among young professionals.",
    averageRent: 26
  },
  "schwabing": {
    id: "schwabing",
    name: "Schwabing (West/Münchner Freiheit)",
    description: "Historic bohemian district with cafes, boutiques, close to the English Garden.",
    averageRent: 25
  },
  "haidhausen": {
    id: "haidhausen",
    name: "Au-Haidhausen",
    description: "Charming historic neighborhood next to the Isar river, French Quarter vibe.",
    averageRent: 24
  },
  "lehel": {
    id: "lehel",
    name: "Altstadt-Lehel",
    description: "The historic city core. Highly premium, rich architecture, museums.",
    averageRent: 28
  },
  "isarvorstadt": {
    id: "isarvorstadt",
    name: "Ludwigsvorstadt-Isarvorstadt",
    description: "Vibrant neighborhood including Glockenbachviertel, theatres, and bars.",
    averageRent: 25
  },
  "neuhausen": {
    id: "neuhausen",
    name: "Neuhausen-Nymphenburg",
    description: "Residential elegance near Nymphenburg Palace, quiet green courtyards.",
    averageRent: 23
  },
  "bogenhausen": {
    id: "bogenhausen",
    name: "Bogenhausen / Johanneskirchen",
    description: "Upscale residential area, combination of grand villas and modern apartments.",
    averageRent: 22
  },
  "moosach": {
    id: "moosach",
    name: "Moosach / Nymphenburg-Gern",
    description: "North-western residential district with excellent transit connections.",
    averageRent: 20
  },
  "allach": {
    id: "allach",
    name: "Allach-Untermenzing",
    description: "Family-oriented, suburban feel with industrial history and nature preserves.",
    averageRent: 18
  },
  "ramersdorf": {
    id: "ramersdorf",
    name: "Ramersdorf-Perlach",
    description: "South-eastern district, highly green, diverse housing options.",
    averageRent: 19
  },
  "wuermtal": {
    id: "wuermtal",
    name: "Würmtal (Gräfelfing/Planegg/Hadern)",
    description: "Affluent suburbs along the Würm river, close to LMU HighTechCampus.",
    averageRent: 21
  }
};
