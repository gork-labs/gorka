/**
 * Version utilities for SecondBrain MCP Server
 *
 * Provides runtime access to package.json version information
 *
 * Created: 2025-07-25T20:37:52+02:00
 * Author: Staff Software Engineer - Gorka
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Interface for package.json structure
 */
interface PackageJson {
  name: string;
  version: string;
  description?: string;
  [key: string]: any;
}

/**
 * Get the current directory of this module
 */
function getCurrentDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  return dirname(__filename);
}

/**
 * Read and parse package.json
 */
function readPackageJson(): PackageJson {
  try {
    // Navigate up from src/utils to the root directory
    const rootDir = join(getCurrentDir(), '..', '..');
    const packageJsonPath = join(rootDir, 'package.json');

    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    return packageJson;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the version from package.json
 */
export function getVersion(): string {
  const packageJson = readPackageJson();
  return packageJson.version;
}

/**
 * Get the package name from package.json
 */
export function getPackageName(): string {
  const packageJson = readPackageJson();
  return packageJson.name;
}

/**
 * Get full package information
 */
export function getPackageInfo(): {
  name: string;
  version: string;
  description?: string;
} {
  const packageJson = readPackageJson();
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description
  };
}

/**
 * Get a formatted version string for logging
 */
export function getVersionString(): string {
  const info = getPackageInfo();
  return `${info.name}@${info.version}`;
}
