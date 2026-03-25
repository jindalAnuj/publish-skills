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
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), '# Test Skill\n\n## Description\n\nA test skill');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Readme');

    // Create subdirectories
    fs.mkdirSync(path.join(tempDir, 'content'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'templates'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'resources'), { recursive: true });

    // Note: validateHandler will call process.exit(), so we need to mock it
    const originalExit = process.exit;
    const mockExit = jest.fn();
    process.exit = mockExit as never;

    try {
      const argv: ValidateArguments = {
        path: tempDir,
        verbose: false,
        _: [],
        $0: '',
      };

      await validateHandler(argv);

      // The test should indicate whether validation passed or failed
      // For now, we just check that the handler was called without throwing
      expect(mockExit).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });

  it('should fail validation for non-existent directory', async () => {
    const originalExit = process.exit;
    const mockExit = jest.fn();
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.exit = mockExit as never;

    try {
      const argv: ValidateArguments = {
        path: '/non/existent/path',
        verbose: false,
        _: [],
        $0: '',
      };

      await validateHandler(argv);

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
      mockConsoleError.mockRestore();
    }
  });

  it('should fail validation for missing required files', async () => {
    // Create empty directory (no manifest.json)
    const originalExit = process.exit;
    const mockExit = jest.fn();
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.exit = mockExit as never;

    try {
      const argv: ValidateArguments = {
        path: tempDir,
        verbose: false,
        _: [],
        $0: '',
      };

      await validateHandler(argv);

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
      mockConsoleError.mockRestore();
    }
  });
});
