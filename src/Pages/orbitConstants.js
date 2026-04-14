
export const RECEIPT_TYPES = {
  FOUNDER_PATH: 1,
  DIRECT_OWNER: 2,
  ROUTED_SPILLOVER: 3,
  RECYCLE: 4
}

export const orbitTypeConfig = {
  P4: {
    name: 'P4',
    contract: 'p4Orbit',
    positions: 4,
    lines: 1,
    lineSizes: [4],
    linePayouts: ['Rule-based from contract'],
    lineSpillovers: ['No structural child line'],
    levels: [1, 4, 7, 10],
    description: 'Single-line orbit'
  },
  P12: {
    name: 'P12',
    contract: 'p12Orbit',
    positions: 12,
    lines: 2,
    lineSizes: [3, 9],
    linePayouts: ['Rule-based from contract'],
    lineSpillovers: ['Rule-based from contract'],
    levels: [2, 5, 8],
    description: 'Two-line orbit'
  },
  P39: {
    name: 'P39',
    contract: 'p39Orbit',
    positions: 39,
    lines: 3,
    lineSizes: [3, 9, 27],
    linePayouts: ['Rule-based from contract', 'Rule-based from contract', 'Rule-based from contract'],
    lineSpillovers: ['Rule-based from contract', 'Rule-based from contract', 'Rule-based from contract'],
    levels: [3, 6, 9],
    description: 'Three-line orbit'
  }
}

export const levelToOrbitType = {
  1: 'P4',
  2: 'P12',
  3: 'P39',
  4: 'P4',
  5: 'P12',
  6: 'P39',
  7: 'P4',
  8: 'P12',
  9: 'P39',
  10: 'P4'
}

export const levelConfig = {
  1: { price: 10, upgradeReq: 20, nextLevel: 2 },
  2: { price: 20, upgradeReq: 40, nextLevel: 3 },
  3: { price: 40, upgradeReq: 80, nextLevel: 4 },
  4: { price: 80, upgradeReq: 160, nextLevel: 5 },
  5: { price: 160, upgradeReq: 320, nextLevel: 6 },
  6: { price: 320, upgradeReq: 640, nextLevel: 7 },
  7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
  8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
  9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
  10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
}
