import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class values', () => {
    expect(cn('a', 'b', undefined, false, 'c')).toBe('a b c');
  });

  it('merges conflicting tailwind classes, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
