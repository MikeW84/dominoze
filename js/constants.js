export const ConstraintType = Object.freeze({
  NONE:        'none',
  EQUAL:       'equal',
  NOT_EQUAL:   'not_equal',
  SUM:         'sum',
  LESS_THAN:   'less_than',
  GREATER:     'greater',
});

export function generateFullDominoSet() {
  const set = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      set.push({ id: `${a}-${b}`, pips: [a, b] });
    }
  }
  return set; // 28 dominoes
}

export const DIFFICULTY = {
  easy: {
    regionCount: [4, 6],
    maxRegionSize: 3,
    constraintTypes: [ConstraintType.EQUAL, ConstraintType.SUM, ConstraintType.NONE],
  },
  medium: {
    regionCount: [5, 8],
    maxRegionSize: 3,
    constraintTypes: [
      ConstraintType.EQUAL, ConstraintType.NOT_EQUAL,
      ConstraintType.SUM, ConstraintType.LESS_THAN, ConstraintType.NONE,
    ],
  },
  hard: {
    regionCount: [6, 10],
    maxRegionSize: 4,
    constraintTypes: [
      ConstraintType.EQUAL, ConstraintType.NOT_EQUAL,
      ConstraintType.SUM, ConstraintType.LESS_THAN,
      ConstraintType.GREATER, ConstraintType.NONE,
    ],
  },
};

export const REGION_COLORS = [
  '#D4E8D0', // sage green
  '#C7D4F4', // soft blue
  '#F4D4C7', // peach
  '#E0D0F4', // lavender
  '#F4E8C7', // warm cream
  '#C7F4E8', // mint
  '#F4C7D4', // pink
  '#D4F4F4', // light cyan
  '#F4F4C7', // pale yellow
  '#D4C7F4', // periwinkle
];

// Standard domino pip dot positions on a 3x3 grid (1-indexed)
export const PIP_LAYOUTS = {
  0: [],
  1: [{ row: 2, col: 2 }],
  2: [{ row: 1, col: 3 }, { row: 3, col: 1 }],
  3: [{ row: 1, col: 3 }, { row: 2, col: 2 }, { row: 3, col: 1 }],
  4: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
  5: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
  6: [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 3 }],
};
