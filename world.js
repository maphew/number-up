(function () {
  'use strict';

  const WORLDS = {
    full: {
      name: 'Full — mixed grid',
      rows: [
        ['7', '+', '3', '×', '8'],
        ['−', '4', '÷', '9', '+'],
        ['2', '×', '.', '6', '+'],
        ['+', '5', '÷', '1', '×'],
        ['8', '−', '3', '+', '7'],
      ],
    },
    a: {
      name: 'A — Number + Number',
      rows: [
        ['3', '8', '2', '5', '9'],
        ['6', '1', '7', '4', '2'],
        ['9', '5', '.', '0', '3'],
        ['1', '4', '8', '2', '6'],
        ['5', '7', '0', '3', '8'],
      ],
    },
    b: {
      name: 'B — Number + Operator',
      rows: [
        ['+', '4', '−', '2', '×'],
        ['9', '×', '6', '+', '8'],
        ['÷', '1', '.', '7', '÷'],
        ['3', '+', '5', '×', '2'],
        ['−', '8', '+', '9', '−'],
      ],
    },
    c: {
      name: 'C — UP vs DOWN',
      rows: [
        ['4', '−', '1', '9', '+'],
        ['2', '+', '7', '÷', '3'],
        ['×', '5', '.', '9', '2'],
        ['8', '÷', '0', '+', '6'],
        ['+', '3', '−', '1', '×'],
      ],
    },
    d: {
      name: 'D — Failure',
      rows: [
        ['9', '−', '0', '×', '3'],
        ['+', '÷', '5', '+', '7'],
        ['×', '2', '.', '−', '0'],
        ['÷', '4', '+', '1', '×'],
        ['8', '−', '6', '÷', '2'],
      ],
    },
  };

  const WORLD_ORDER = ['full', 'a', 'b', 'c', 'd'];

  function mulberry32(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
      return ((t ^ (t >>> 7)) ^ (t >>> 14)) >>> 0;
    };
  }

  const OPS = ['+', '−', '×', '÷'];

  function generateWorld(seed) {
    const rand = mulberry32(seed);
    const rows = [];
    for (let y = 0; y < 5; y++) {
      const row = [];
      for (let x = 0; x < 5; x++) {
        if (x === 2 && y === 2) {
          row.push('.');
          continue;
        }
        row.push(rand() % 10 < 6 ? String(rand() % 10) : OPS[rand() % 4]);
      }
      rows.push(row);
    }
    return { name: `Generated #${seed}`, rows, seed };
  }

  function findStart(world) {
    for (let y = 0; y < world.rows.length; y++) {
      const x = world.rows[y].indexOf('.');
      if (x !== -1) return { x, y };
    }
    const m = (world.rows.length - 1) / 2;
    return { x: m, y: m };
  }

  globalThis.NumberUpWorlds = { WORLDS, WORLD_ORDER, findStart, generateWorld };
})();
