import type { SemanticMode } from "./types";

interface ThemePreset {
  label: string;
  theme: string;
  mode: SemanticMode;
  intent: string;
  phrases?: boolean;
}

interface ThemePresetGroup {
  name: string;
  presets: ThemePreset[];
}

const THEME_PRESET_GROUPS: ThemePresetGroup[] = [
  {
    name: "Story worlds",
    presets: [
      { label: "Haunted House", theme: "haunted house", mode: "evocative", intent: "Gothic, eerie, domestic" },
      { label: "Clockwork City", theme: "clockwork city", mode: "concrete", intent: "Mechanisms, streets, civic detail" },
      { label: "Forgotten Library", theme: "forgotten library", mode: "sensory", intent: "Dust, paper, quiet rooms" },
      { label: "Royal Court", theme: "royal court", mode: "related", intent: "Power, ceremony, intrigue" },
      { label: "Secret Laboratory", theme: "secret laboratory", mode: "concrete", intent: "Tools, specimens, machinery" },
    ],
  },
  {
    name: "Places & nature",
    presets: [
      { label: "Desert Ruins", theme: "desert ruins", mode: "concrete", intent: "Stone, heat, lost places" },
      { label: "Arctic Expedition", theme: "arctic expedition", mode: "actions", intent: "Travel, survival, weather" },
      { label: "Garden Sanctuary", theme: "garden sanctuary", mode: "sensory", intent: "Greenery, texture, calm" },
      { label: "Ocean Trench", theme: "ocean trench", mode: "concrete", intent: "Depth, pressure, sea life" },
      { label: "Volcanic Island", theme: "volcanic island", mode: "sensory", intent: "Heat, ash, terrain" },
    ],
  },
  {
    name: "Genre & mood",
    presets: [
      { label: "Cyberpunk Alley", theme: "cyberpunk alley", mode: "evocative", intent: "Neon, rain, technology" },
      { label: "Underworld Journey", theme: "underworld journey", mode: "mood", intent: "Mythic, ominous, passage", phrases: true },
      { label: "Dream Carnival", theme: "dream carnival", mode: "evocative", intent: "Surreal, playful, uncanny" },
      { label: "Noir City", theme: "noir city", mode: "mood", intent: "Shadows, suspicion, streets" },
      { label: "Cozy Village", theme: "cozy village", mode: "mood", intent: "Warmth, comfort, neighbors" },
    ],
  },
  {
    name: "Speculative",
    presets: [
      { label: "Alien Ecosystem", theme: "alien ecosystem", mode: "concrete", intent: "Organisms, habitats, anatomy" },
      { label: "Space Station", theme: "space station", mode: "concrete", intent: "Modules, equipment, orbit" },
      { label: "Time Loop", theme: "time loop", mode: "related", intent: "Repetition, causality, clues", phrases: true },
      { label: "Mythic Forest", theme: "mythic forest", mode: "evocative", intent: "Wonder, danger, old magic" },
    ],
  },
];

export { THEME_PRESET_GROUPS };
export type { ThemePreset, ThemePresetGroup };
