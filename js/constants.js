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

export const BOARD_SHAPES = {
  easy: [
    // Rectangles
    { rows: 2, cols: 3, mask: null },   // 6 cells
    { rows: 2, cols: 4, mask: null },   // 8 cells
    { rows: 2, cols: 5, mask: null },   // 10 cells
    // Non-rectangular
    { rows: 3, cols: 3, mask: [         // L-shape, 6 cells
      1,1,0,
      1,0,0,
      1,1,1,
    ]},
    { rows: 3, cols: 3, mask: [         // Corner notch, 8 cells
      0,1,1,
      1,1,1,
      1,1,1,
    ]},
    { rows: 3, cols: 4, mask: [         // Tapered, 10 cells
      1,1,1,1,
      1,1,1,1,
      0,1,1,0,
    ]},
  ],
  medium: [
    // Rectangles
    { rows: 3, cols: 4, mask: null },   // 12 cells
    { rows: 2, cols: 6, mask: null },   // 12 cells
    // Non-rectangular
    { rows: 3, cols: 4, mask: [         // Diamond, 8 cells
      0,1,1,0,
      1,1,1,1,
      0,1,1,0,
    ]},
    { rows: 4, cols: 3, mask: [         // Plus, 8 cells
      0,1,0,
      1,1,1,
      1,1,1,
      0,1,0,
    ]},
    { rows: 3, cols: 4, mask: [         // S-step, 10 cells
      0,1,1,1,
      1,1,1,1,
      1,1,1,0,
    ]},
    { rows: 4, cols: 4, mask: [         // Fat cross, 12 cells
      0,1,1,0,
      1,1,1,1,
      1,1,1,1,
      0,1,1,0,
    ]},
  ],
  hard: [
    // Rectangles
    { rows: 4, cols: 4, mask: null },   // 16 cells
    { rows: 2, cols: 8, mask: null },   // 16 cells
    { rows: 3, cols: 4, mask: null },   // 12 cells
    // Non-rectangular
    { rows: 4, cols: 5, mask: [         // Big cross, 12 cells
      0,0,1,0,0,
      0,1,1,1,0,
      1,1,1,1,1,
      0,1,1,1,0,
    ]},
    { rows: 4, cols: 4, mask: [         // U-shape, 12 cells
      1,1,1,1,
      1,0,0,1,
      1,0,0,1,
      1,1,1,1,
    ]},
    { rows: 4, cols: 4, mask: [         // H-shape, 12 cells
      1,0,0,1,
      1,1,1,1,
      1,1,1,1,
      1,0,0,1,
    ]},
    { rows: 5, cols: 5, mask: [         // Thick plus, 16 cells
      0,1,1,0,0,
      1,1,1,1,0,
      1,1,1,1,1,
      0,1,1,1,0,
      0,0,1,1,0,
    ]},
  ],
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

// Board shape pairs for split mode [boardA, boardB]
export const SPLIT_BOARD_SHAPES = {
  easy: [
    [{ rows: 2, cols: 3, mask: null }, { rows: 2, cols: 3, mask: null }],
    [{ rows: 2, cols: 2, mask: null }, { rows: 2, cols: 3, mask: null }],
    // Non-rectangular
    [{ rows: 3, cols: 3, mask: [1,1,0, 1,0,0, 1,1,1] },
     { rows: 3, cols: 3, mask: [0,1,1, 0,0,1, 1,1,1] }],
    [{ rows: 3, cols: 3, mask: [1,1,0, 1,0,0, 1,1,1] },
     { rows: 2, cols: 3, mask: null }],
  ],
  medium: [
    [{ rows: 2, cols: 3, mask: null }, { rows: 2, cols: 4, mask: null }],
    [{ rows: 2, cols: 4, mask: null }, { rows: 2, cols: 4, mask: null }],
    // Non-rectangular
    [{ rows: 3, cols: 4, mask: [0,1,1,0, 1,1,1,1, 0,1,1,0] },
     { rows: 3, cols: 3, mask: [1,1,0, 1,0,0, 1,1,1] }],
    [{ rows: 3, cols: 4, mask: [0,1,1,1, 1,1,1,1, 1,1,1,0] },
     { rows: 3, cols: 3, mask: [0,1,1, 0,0,1, 1,1,1] }],
  ],
  hard: [
    [{ rows: 3, cols: 4, mask: null }, { rows: 3, cols: 4, mask: null }],
    [{ rows: 4, cols: 4, mask: null }, { rows: 3, cols: 4, mask: null }],
    [{ rows: 3, cols: 6, mask: null }, { rows: 3, cols: 4, mask: null }],
    [{ rows: 4, cols: 4, mask: null }, { rows: 4, cols: 4, mask: null }],
    // Non-rectangular
    [{ rows: 4, cols: 4, mask: [1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1] },
     { rows: 4, cols: 4, mask: [1,0,0,1, 1,1,1,1, 1,1,1,1, 1,0,0,1] }],
    [{ rows: 4, cols: 5, mask: [0,0,1,0,0, 0,1,1,1,0, 1,1,1,1,1, 0,1,1,1,0] },
     { rows: 3, cols: 4, mask: [1,1,1,1, 1,1,1,1, 0,1,1,0] }],
    [{ rows: 4, cols: 4, mask: [1,0,0,1, 1,1,1,1, 1,1,1,1, 1,0,0,1] },
     { rows: 3, cols: 3, mask: [0,1,1, 1,1,1, 1,1,1] }],
    [{ rows: 4, cols: 4, mask: [1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1] },
     { rows: 3, cols: 4, mask: [1,1,1,1, 1,1,1,1, 0,1,1,0] }],
  ],
};

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
