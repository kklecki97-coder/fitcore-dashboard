import { describe, it, expect } from 'vitest';
import { parseAIProgramResponse } from '../ai-parsing';

describe('parseAIProgramResponse', () => {
  const validJSON = JSON.stringify({
    programName: 'Strength Phase 1',
    durationWeeks: 8,
    days: [
      {
        name: 'Upper Body',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '8-10', weight: '80kg', rpe: 8, tempo: '2/0/1/0', restSeconds: 120, notes: 'Focus on form' },
          { name: 'Rows', sets: 3, reps: '10', weight: '', rpe: null, tempo: '', restSeconds: 90, notes: '' },
        ],
      },
      {
        name: 'Lower Body',
        exercises: [
          { name: 'Squat', sets: 5, reps: '5', weight: '100kg', rpe: 9, tempo: '3/1/1/0', restSeconds: 180, notes: 'Belt on' },
        ],
      },
    ],
    trackedLifts: [
      { name: 'Bench Press', currentValue: 80 },
      { name: 'Squat', currentValue: 100 },
      { name: 'Deadlift', currentValue: 140 },
    ],
    clientGoals: ['Build muscle', 'Increase strength'],
  });

  it('parses valid JSON into a WorkoutProgram', () => {
    const { program } = parseAIProgramResponse(validJSON);
    expect(program.name).toBe('Strength Phase 1');
    expect(program.durationWeeks).toBe(8);
    expect(program.days).toHaveLength(2);
    expect(program.status).toBe('draft');
  });

  it('parses exercises correctly', () => {
    const { program } = parseAIProgramResponse(validJSON);
    const bench = program.days[0].exercises[0];
    expect(bench.name).toBe('Bench Press');
    expect(bench.sets).toBe(4);
    expect(bench.reps).toBe('8-10');
    expect(bench.rpe).toBe(8);
    expect(bench.restSeconds).toBe(120);
  });

  it('generates unique IDs for program, days, and exercises', () => {
    const { program } = parseAIProgramResponse(validJSON);
    expect(program.id).toBeTruthy();
    expect(program.days[0].id).toBeTruthy();
    expect(program.days[0].exercises[0].id).toBeTruthy();
    // IDs should be unique
    expect(program.days[0].id).not.toBe(program.days[1].id);
    expect(program.days[0].exercises[0].id).not.toBe(program.days[0].exercises[1].id);
  });

  it('extracts tracked lifts', () => {
    const { trackedLifts } = parseAIProgramResponse(validJSON);
    expect(trackedLifts.bench_press).toBe(80);
    expect(trackedLifts.squat).toBe(100);
    expect(trackedLifts.deadlift).toBe(140);
  });

  it('extracts client goals', () => {
    const { clientGoals } = parseAIProgramResponse(validJSON);
    expect(clientGoals).toEqual(['Build muscle', 'Increase strength']);
  });

  it('assigns clientId when provided', () => {
    const { program } = parseAIProgramResponse(validJSON, 'client-123');
    expect(program.clientIds).toEqual(['client-123']);
  });

  it('handles missing clientId', () => {
    const { program } = parseAIProgramResponse(validJSON);
    expect(program.clientIds).toEqual([]);
  });

  it('strips markdown code fences', () => {
    const wrapped = '```json\n' + validJSON + '\n```';
    const { program } = parseAIProgramResponse(wrapped);
    expect(program.name).toBe('Strength Phase 1');
  });

  it('uses defaults for missing fields', () => {
    const minimal = JSON.stringify({
      days: [{ name: 'Day 1', exercises: [{ name: 'Push-ups' }] }],
    });
    const { program } = parseAIProgramResponse(minimal);
    expect(program.name).toBe('AI Generated Program');
    expect(program.durationWeeks).toBe(8);
    expect(program.days[0].exercises[0].sets).toBe(3);
    expect(program.days[0].exercises[0].reps).toBe('10');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAIProgramResponse('not json at all')).toThrow();
  });
});
