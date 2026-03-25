import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import { SkillValidator } from '../validators/SkillValidator';
import { ValidationError } from '../types';
import type { Skill } from '../models/Skill';

export interface ValidateArguments extends yargs.Arguments {
  path: string;
  verbose?: boolean;
}

/**
 * Reads skill metadata from a directory
 */
function readSkillMetadata(skillPath: string): Partial<Skill> {
  const manifestPath = path.join(skillPath, 'manifest.json');
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  if (fs.existsSync(manifestPath)) {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as Partial<Skill>;
  }

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const nameMatch = content.match(/# (.+)/);
    const descMatch = content.match(/## Description\n\n(.+)/);

    return {
      id: path.basename(skillPath),
      name: nameMatch ? nameMatch[1].trim() : path.basename(skillPath),
      version: '1.0.0',
      description: descMatch ? descMatch[1].trim() : 'No description provided.',
    };
  }

  throw new ValidationError('No manifest.json or SKILL.md found in skill directory', {
    path: skillPath,
  });
}

/**
 * Validates skill directory structure
 */
function validateDirectoryStructure(skillPath: string): string[] {
  const issues: string[] = [];

  // Check for required files
  const requiredFiles = ['manifest.json', 'SKILL.md', 'README.md'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(skillPath, file))) {
      issues.push(`Missing required file: ${file}`);
    }
  }

  // Check for recommended directories
  const recommendedDirs = ['content', 'templates', 'resources'];
  for (const dir of recommendedDirs) {
    const dirPath = path.join(skillPath, dir);
    if (!fs.existsSync(dirPath)) {
      issues.push(`Missing recommended directory: ${dir}/`);
    }
  }

  return issues;
}

/**
 * Validates skill metadata against schema
 */
function validateMetadataSchema(metadata: Partial<Skill>): string[] {
  const issues: string[] = [];

  // Validate required fields
  if (!metadata.id) issues.push('Missing required field: id');
  if (!metadata.name) issues.push('Missing required field: name');
  if (!metadata.version) issues.push('Missing required field: version');
  if (!metadata.description) issues.push('Missing required field: description');
  if (!metadata.author) issues.push('Missing required field: author');
  if (!metadata.license) issues.push('Missing required field: license');
  if (!metadata.agentSupport) issues.push('Missing required field: agentSupport');

  // Validate field formats
  if (metadata.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(metadata.name)) {
    issues.push('Skill name must be in kebab-case');
  }

  if (metadata.version && !/^\d+\.\d+\.\d+/.test(metadata.version)) {
    issues.push('Version must follow semver format (e.g., 1.0.0)');
  }

  if (metadata.description && metadata.description.length > 160) {
    issues.push(`Description exceeds 160 characters (${metadata.description.length})`);
  }

  if (metadata.id && !/^[a-zA-Z0-9-_]+$/.test(metadata.id)) {
    issues.push('ID must contain only alphanumeric characters, hyphens, and underscores');
  }

  return issues;
}

/**
 * Handler for the validate command
 */
export const handler = async (argv: ValidateArguments): Promise<void> => {
  try {
    const skillPath = path.resolve(argv.path || '.');

    if (!fs.existsSync(skillPath)) {
      throw new ValidationError('Directory does not exist', { path: skillPath });
    }

    console.log(chalk.cyan(`\n📋 Validating skill: ${skillPath}\n`));

    // Check directory structure
    const spinner = ora('Checking directory structure...').start();
    const structureIssues = validateDirectoryStructure(skillPath);
    spinner.stop();

    // Read metadata
    const metadataSpinner = ora('Reading skill metadata...').start();
    let metadata: Partial<Skill>;
    try {
      metadata = readSkillMetadata(skillPath);
      metadataSpinner.succeed('Skill metadata loaded');
    } catch (error) {
      metadataSpinner.fail('Failed to read skill metadata');
      throw error;
    }

    // Validate metadata
    const schemaSpinner = ora('Validating metadata schema...').start();
    const schemaIssues = validateMetadataSchema(metadata);
    schemaSpinner.stop();

    // Use SkillValidator for additional checks
    const validatorSpinner = ora('Running additional validations...').start();
    const validator: SkillValidator = new SkillValidator();
    try {
      validator.validateMetadata(metadata);
      validatorSpinner.succeed('Additional validations passed');
    } catch (error) {
      validatorSpinner.stop();
      schemaIssues.push((error as Error).message);
    }

    // Report results
    const allIssues = [...structureIssues, ...schemaIssues];

    if (allIssues.length === 0) {
      console.log(chalk.green('\n✓ Skill is valid!\n'));
      console.log(chalk.bold('Skill Details:'));
      console.log(`  Name:        ${metadata.name}`);
      console.log(`  Version:     ${metadata.version}`);
      console.log(`  Description: ${metadata.description}`);
      console.log(
        `  Supported:   ${Object.keys(metadata.agentSupport || {}).join(', ') || 'None'}\n`
      );
      process.exit(0);
    } else {
      console.log(chalk.yellow(`\n⚠ Validation found ${allIssues.length} issue(s):\n`));
      for (const issue of allIssues) {
        console.log(chalk.yellow(`  • ${issue}`));
      }

      if (argv.verbose) {
        console.log(chalk.gray('\nFull metadata:'));
        console.log(chalk.gray(JSON.stringify(metadata, null, 2)));
      }

      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
};
