import { describe, it, expect } from 'vitest';
import { StatsObjectSchema, LastAnswerObjectSchema, OQSEPFileSchema } from './progressValidation';

describe('Progress Validation Schemas', () => {
  it('StatsObjectSchema: incorrect cannot be higher than attempts', () => {
    // Valid case
    expect(StatsObjectSchema.safeParse({ attempts: 5, incorrect: 2, streak: 3 }).success).toBe(true);
    
    // Invalid case
    const invalidStats = { attempts: 2, incorrect: 5, streak: 0 };
    const result = StatsObjectSchema.safeParse(invalidStats);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/incorrect cannot be higher than attempts/i);
    }
  });

  it('LastAnswerObjectSchema: if isSkipped=true, isCorrect must be false', () => {
    // Valid cases
    expect(LastAnswerObjectSchema.safeParse({ isCorrect: true, answeredAt: '2025-01-01T00:00:00Z' }).success).toBe(true);
    expect(LastAnswerObjectSchema.safeParse({ isCorrect: false, isSkipped: true, answeredAt: '2025-01-01T00:00:00Z' }).success).toBe(true);

    // Invalid case: skipped but correct is true
    const invalidSkipped = { isCorrect: true, isSkipped: true, answeredAt: '2025-01-01T00:00:00Z' };
    const result = LastAnswerObjectSchema.safeParse(invalidSkipped);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/isSkipped=true, isCorrect must be false/i);
    }
  });

  it('OQSEPFileSchema: rejects non-UUID record keys', () => {
    const invalidFile = {
      version: "0.1",
      meta: {
        setId: "123e4567-e89b-12d3-a456-426614174000",
        exportedAt: "2025-01-01T00:00:00Z"
      },
      records: {
        "123e4567-e89b-12d3-a456-426614174000": {
          bucket: 1,
          stats: { attempts: 1, incorrect: 0, streak: 1 }
        },
        "invalid-key": {
          bucket: 1,
          stats: { attempts: 1, incorrect: 0, streak: 1 }
        }
      }
    };
    
    const result = OQSEPFileSchema.safeParse(invalidFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(issue => 
          issue.message.includes('UUID') || issue.message.includes('Invalid')
        )
      ).toBe(true);
    }
  });
});

