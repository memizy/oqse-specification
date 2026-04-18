import { describe, it, expect } from 'vitest';
import { OQSEActionSchema, FeatureFlagSchema, ManifestCapabilitiesSchema, OQSEManifestSchema } from './manifestValidation';

describe('Manifest Validation Schemas', () => {
  it('OQSEActionSchema: allows official actions and x- prefixes', () => {
    expect(OQSEActionSchema.safeParse('render').success).toBe(true); // Official
    expect(OQSEActionSchema.safeParse('x-custom-action').success).toBe(true); // Custom
    expect(OQSEActionSchema.safeParse('unknown').success).toBe(false); // Invalid
  });

  it('FeatureFlagSchema: allows official features and x- prefixes', () => {
    expect(FeatureFlagSchema.safeParse('markdown').success).toBe(true); // Official
    expect(FeatureFlagSchema.safeParse('x-experimental-feature').success).toBe(true); // Custom
    expect(FeatureFlagSchema.safeParse('randomFeature').success).toBe(false); // Invalid
  });

  it('ManifestCapabilitiesSchema: requires at least one action', () => {
    const validManifest = { actions: ['render'], features: [] };
    expect(ManifestCapabilitiesSchema.safeParse(validManifest).success).toBe(true);

    const invalidManifest = { actions: [], features: [] };
    const result = ManifestCapabilitiesSchema.safeParse(invalidManifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/must support at least one action/i);
    }
  });

  it('OQSEManifestSchema: fails when minOqseVersion > maxOqseVersion', () => {
    const invalidManifest = {
      version: "1.0",
      id: "org.example",
      appName: "Test App",
      minOqseVersion: "2.0",
      maxOqseVersion: "1.0",
      capabilities: { actions: ["render"], features: [] }
    };
    
    const result = OQSEManifestSchema.safeParse(invalidManifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes('not be greater than'))).toBe(true);
    }
  });

  it('OQSEManifestSchema: succeeds with valid version boundaries (min < max)', () => {
    const validManifest = {
      version: "1.0",
      id: "org.example",
      appName: "Test App",
      minOqseVersion: "0.1",
      maxOqseVersion: "1.99",
      capabilities: { actions: ["render"], features: [] }
    };
    
    const result = OQSEManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });
});

