/**
 * Tests for version utilities
 *
 * Validates that version information is correctly read from package.json
 *
 * Created: 2025-07-25T20:37:52+02:00
 * Author: Staff Software Engineer - Gorka
 */

import { describe, it, expect } from 'vitest';
import { getVersion, getPackageName, getPackageInfo, getVersionString } from '../../src/utils/version.js';

describe('Version Utilities', () => {
  describe('getVersion', () => {
    it('should return a valid version string', () => {
      const version = getVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+/); // Semantic versioning pattern
    });

    it('should return the expected version from package.json', () => {
      const version = getVersion();
      expect(version).toBe('0.14.0'); // Current version in package.json
    });
  });

  describe('getPackageName', () => {
    it('should return the correct package name', () => {
      const name = getPackageName();
      expect(name).toBe('@gork-labs/secondbrain-mcp');
    });
  });

  describe('getPackageInfo', () => {
    it('should return complete package information', () => {
      const info = getPackageInfo();

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('description');

      expect(info.name).toBe('@gork-labs/secondbrain-mcp');
      expect(info.version).toBe('0.14.0');
      expect(typeof info.description).toBe('string');
    });
  });

  describe('getVersionString', () => {
    it('should return formatted version string', () => {
      const versionString = getVersionString();
      expect(versionString).toBe('@gork-labs/secondbrain-mcp@0.14.0');
    });

    it('should include both name and version', () => {
      const versionString = getVersionString();
      expect(versionString).toContain('@gork-labs/secondbrain-mcp');
      expect(versionString).toContain('0.14.0');
      expect(versionString).toContain('@');
    });
  });

  describe('Error handling', () => {
    it('should handle module path resolution correctly', () => {
      // This test ensures the utility can find package.json from any location
      expect(() => getVersion()).not.toThrow();
      expect(() => getPackageName()).not.toThrow();
      expect(() => getPackageInfo()).not.toThrow();
      expect(() => getVersionString()).not.toThrow();
    });
  });
});
