import {
  calculateProductivityScore,
  calculateFocusTime,
  calculateContextSwitches,
  calculateGoalCompletionRate
} from '../src/utils/metricsCalculations';

describe('calculateProductivityScore', () => {
  test('returns 0 for no tracked time', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 0,
      goalCompletionRate: 0,
      contextSwitches: 0,
      totalTrackedMinutes: 0
    });
    expect(result).toBe(0);
  });

  test('returns 100 for perfect inputs', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 480,
      goalCompletionRate: 100,
      contextSwitches: 0,
      totalTrackedMinutes: 480
    });
    expect(result).toBe(100);
  });

  test('penalizes context switches', () => {
    const noSwitches = calculateProductivityScore({
      focusTimeMinutes: 240,
      goalCompletionRate: 50,
      contextSwitches: 0,
      totalTrackedMinutes: 480
    });
    const manySwitches = calculateProductivityScore({
      focusTimeMinutes: 240,
      goalCompletionRate: 50,
      contextSwitches: 10,
      totalTrackedMinutes: 480
    });
    expect(noSwitches).toBeGreaterThan(manySwitches);
  });

  test('clamps values between 0 and 100', () => {
    const result = calculateProductivityScore({
      focusTimeMinutes: 1000,
      goalCompletionRate: 200,
      contextSwitches: -5,
      totalTrackedMinutes: 100
    });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('calculateFocusTime', () => {
  test('returns 0 for empty events', () => {
    expect(calculateFocusTime([])).toBe(0);
  });

  test('sums duration of focus categories', () => {
    const events = [
      { category: 'work', duration: 60 },
      { category: 'break', duration: 15 },
      { category: 'deep-work', duration: 120 }
    ];
    expect(calculateFocusTime(events)).toBe(180);
  });
});

describe('calculateContextSwitches', () => {
  test('returns 0 for single event', () => {
    expect(calculateContextSwitches([{ category: 'work' }])).toBe(0);
  });

  test('counts category changes', () => {
    const events = [
      { category: 'work' },
      { category: 'work' },
      { category: 'break' },
      { category: 'work' }
    ];
    expect(calculateContextSwitches(events)).toBe(2);
  });
});

describe('calculateGoalCompletionRate', () => {
  test('returns 0 for no goals', () => {
    expect(calculateGoalCompletionRate([])).toBe(0);
  });

  test('calculates percentage correctly', () => {
    const goals = [
      { completed: true },
      { completed: false },
      { completed: true },
      { completed: true }
    ];
    expect(calculateGoalCompletionRate(goals)).toBe(75);
  });
});
