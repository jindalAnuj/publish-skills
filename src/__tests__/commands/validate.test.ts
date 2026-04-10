import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handler as validateHandler } from '../../commands/validate';
import type { ValidateArguments } from '../../commands/validate';

describe('validate command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-validate-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should validate a skill with manifest.json', async () => {
    // Create manifest.json with all required fields
    const manifest = {
      id: 'test-skill',
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill',
      author: { name: 'Test Author', email: 'test@example.com' },
      license: 'ISC',
      tags: ['test'],
      schemaVersion: '1.0.0',
      agentSupport: { claude: { supported: true } },
      content: {
        prompts: [],
        workflows: [],
        templates: [],
        resources: [],
      },
    };

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(
      path.join(tempDir, 'SKILL.md'),
      '# Test Skill\n\n## Description\n\nA test skill'
    );
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Readme');

    // Create subdirectories
    fs.mkdirSync(path.join(tempDir, 'content'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'resources'), { recursive: true });

    const argv: ValidateArguments = {
      path: tempDir,
      verbose: false,
      _: [],
      $0: '',
    };

    // Should resolve successfully without calling process.exit
    await expect(validateHandler(argv)).resolves.toBeUndefined();
  });

  it('should fail validation for non-existent directory', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const argv: ValidateArguments = {
      path: '/non/existent/path',
      verbose: false,
      _: [],
      $0: '',
    };

    await expect(validateHandler(argv)).rejects.toThrow('Directory does not exist');
    expect(mockConsoleError).toHaveBeenCalled();
    mockConsoleError.mockRestore();
  });

  it('should fail validation for missing required files', async () => {
    // Create empty directory (no manifest.json)
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const argv: ValidateArguments = {
      path: tempDir,
      verbose: false,
      _: [],
      $0: '',
    };

    await expect(validateHandler(argv)).rejects.toThrow('No manifest.json or SKILL.md found');
    expect(mockConsoleError).toHaveBeenCalled();
    mockConsoleError.mockRestore();
  });
});
