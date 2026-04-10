import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import { input, confirm } from '@inquirer/prompts';
import { ValidationError } from '../types';
import type { Skill } from '../models/Skill';

export interface CreateArguments extends yargs.Arguments {
  name?: string;
  path?: string;
  description?: string;
  author?: string;
  interactive?: boolean;
}

/**
 * Validates skill name format (kebab-case, alphanumeric with hyphens)
 */
function isValidSkillName(name: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}

/**
 * Creates a skill directory structure with template files
 */
async function createSkillDirectory(
  skillName: string,
  skillPath: string,
  metadata: Partial<Skill>
): Promise<void> {
  const spinner = ora(`Creating skill directory at ${skillPath}`).start();

  try {
    // Create main directory
    if (!fs.existsSync(skillPath)) {
      fs.mkdirSync(skillPath, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['content', 'templates', 'resources'];
    for (const subdir of subdirs) {
      const subpath = path.join(skillPath, subdir);
      if (!fs.existsSync(subpath)) {
        fs.mkdirSync(subpath, { recursive: true });
      }
    }

    // Create manifest.json
    const manifest: Partial<Skill> = {
      id: metadata.id || skillName,
      name: metadata.name || skillName,
      version: '1.0.0',
      description: metadata.description || 'A new AI agent skill',
      author: metadata.author || { name: 'Unknown' },
      license: 'ISC',
      tags: [],
      schemaVersion: '1.0.0',
      agentSupport: {
        claude: { supported: true },
        gemini: { supported: true },
        cline: { supported: true },
      },
      content: {
        prompts: [],
        workflows: [],
        templates: [],
        resources: [],
      },
    };

    fs.writeFileSync(path.join(skillPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Create SKILL.md template
    const skillMd = `# ${metadata.name || skillName}

## Description

${metadata.description || 'A new AI agent skill'}

## Usage

TODO: Document how to use this skill

## Configuration

TODO: Document configuration options

## Examples

\`\`\`javascript
// TODO: Add usage examples
\`\`\`

## Requirements

- Node.js 18.x or higher
- npm or yarn

## License

ISC
`;

    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd);

    // Create README.md
    const readme = `# ${metadata.name || skillName}

${metadata.description || 'A new AI agent skill'}

## Getting Started

1. \`npm install\`
2. Review \`SKILL.md\` for documentation
3. Customize the skill for your needs

## Project Structure

- \`manifest.json\` — Skill metadata and configuration
- \`SKILL.md\` — Skill documentation
- \`content/\` — Skill content files (prompts, workflows, etc.)
- \`templates/\` — Template files
- \`resources/\` — Additional resources

## Publishing

To publish this skill, run:

\`\`\`bash
npx publish-skills publish .
\`\`\`

For more information, see the [publish-skills documentation](https://github.com/jindalAnuj/publish-skills).
`;

    fs.writeFileSync(path.join(skillPath, 'README.md'), readme);

    // Create .gitignore
    const gitignore = `node_modules/
dist/
*.log
.env
.env.local
.DS_Store
`;

    fs.writeFileSync(path.join(skillPath, '.gitignore'), gitignore);

    spinner.succeed(`✓ Skill created at ${chalk.cyan(skillPath)}`);
  } catch (error) {
    spinner.fail(`Failed to create skill directory`);
    throw error;
  }
}

async function interactiveCreate(): Promise<Record<string, unknown>> {
  console.log(chalk.cyan('\n📦 Create a New Skill\n'));

  const name = await input({
    message: 'Skill name (kebab-case, e.g., my-awesome-skill)',
    validate: (val) => {
      if (!val) return 'Skill name is required';
      if (!isValidSkillName(val)) return 'Use kebab-case letters and hyphens only';
      return true;
    },
  });

  const description = await input({
    message: 'Short description (≤160 chars)',
    validate: (val) => {
      if (!val) return 'Description is required';
      if (val.length > 160) return 'Description must be 160 characters or less';
      return true;
    },
  });

  const author = await input({
    message: 'Author name',
  });

  const targetPath = await input({
    message: 'Directory path (defaults to cwd)',
    default: process.cwd(),
  });

  return {
    name,
    description,
    author,
    path: targetPath,
    interactive: true,
  };
}

export const handler = async (argv: CreateArguments): Promise<void> => {
  try {
    let args = argv;

    // If no arguments provided, go interactive
    if (!argv.name) {
      args = (await interactiveCreate()) as CreateArguments;
    }

    const skillName = args.name || (argv._ && argv._[1]);
    const description = args.description || 'A new AI agent skill';
    const author = args.author ? { name: args.author } : { name: 'Unknown' };
    const targetPath = args.path
      ? path.resolve(args.path, skillName as string)
      : path.join(process.cwd(), skillName as string);

    // Validate skill name
    if (!isValidSkillName(skillName as string)) {
      throw new ValidationError('Skill name must be in kebab-case (e.g., my-awesome-skill)');
    }

    // Check if directory already exists
    if (fs.existsSync(targetPath)) {
      const shouldOverwrite = await confirm({
        message: `Directory ${skillName} already exists. Overwrite?`,
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow('✗ Cancelled'));
        return;
      }
    }

    // Create the skill
    await createSkillDirectory(skillName as string, targetPath, {
      name: skillName as string,
      description,
      author,
    });

    console.log(chalk.green('\n✓ Skill created successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(`  1. cd ${skillName}`);
    console.log(`  2. Customize manifest.json and SKILL.md`);
    console.log(`  3. Run: npx publish-skills publish .\n`);
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    throw error;
  }
};
