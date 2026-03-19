import { describe, it, expect } from 'vitest';
import { extractLabel } from '../workout-labels';

describe('extractLabel', () => {
  it('strips day prefix and detects Push', () => {
    expect(extractLabel('Monday - Push Day')).toBe('Push');
  });

  it('detects Pull', () => {
    expect(extractLabel('Wed - Pull Workout')).toBe('Pull');
  });

  it('detects Upper', () => {
    expect(extractLabel('Upper Body')).toBe('Upper');
  });

  it('detects Lower', () => {
    expect(extractLabel('Friday: Lower Body')).toBe('Lower');
  });

  it('detects Legs', () => {
    expect(extractLabel('Leg Day')).toBe('Legs');
  });

  it('detects BJJ', () => {
    expect(extractLabel('Tuesday - Jiu-Jitsu')).toBe('BJJ');
  });

  it('detects BJJ + Boxing combo', () => {
    expect(extractLabel('Monday - Boxing + Jiu-Jitsu')).toBe('BJJ + Box');
  });

  it('detects MMA', () => {
    expect(extractLabel('MMA Training')).toBe('MMA');
  });

  it('detects Boxing alone', () => {
    expect(extractLabel('Boxing Session')).toBe('Boxing');
  });

  it('detects Gym/Strength', () => {
    expect(extractLabel('Full Body Strength')).toBe('Gym');
  });

  it('detects Cardio', () => {
    expect(extractLabel('Cardio Session')).toBe('Cardio');
  });

  it('detects HIIT', () => {
    expect(extractLabel('HIIT Training')).toBe('HIIT');
  });

  it('detects Yoga', () => {
    expect(extractLabel('Yoga & Stretch')).toBe('Yoga');
  });

  it('truncates unknown long names to 8 chars', () => {
    expect(extractLabel('Specialized Training A')).toBe('Speciali');
  });

  it('keeps short unknown names as-is', () => {
    expect(extractLabel('Day A')).toBe('Day A');
  });

  it('strips various day formats', () => {
    expect(extractLabel('Mon - Push')).toBe('Push');
    expect(extractLabel('Tuesday: Upper')).toBe('Upper');
    expect(extractLabel('Thursday – Lower')).toBe('Lower');
  });
});
