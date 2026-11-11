// Fixed categorical palette for the Reports charts, validated on the #000000
// surface with the dataviz skill's validator (all checks pass, dark mode).
// Slot order is the colorblind-safety mechanism: do not reorder without
// re-running the validator. Colors follow the rank of a category, not its id.
export const CHART_PALETTE = [
  "#2f62ff", // 1 cobalt (accent)
  "#dc7530", // 2 orange
  "#14a08a", // 3 aqua
  "#a88322", // 4 ochre
  "#d0559a", // 5 magenta
  "#8f74e6", // 6 violet
] as const;

export const CHART_OTHER_COLOR = "#737883";
export const CHART_OTHER_LABEL = "Other";
export const CHART_TOP_N = CHART_PALETTE.length;
