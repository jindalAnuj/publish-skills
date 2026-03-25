import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handler as createHandler } from '../../commands/create';
import type { CreateArguments } from '../../commands/create';

describe('create command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-skills-create-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should create a new skill directory with all required files', async () => {
    const skillName = 'test-skill';
    const originalExit = process.exit;
    const mockExit = jest.fn();
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

    process.exit = mockExit as never;

    try {
      const argv: CreateArguments = {
        name: skillName,
        description: 'A test skill',
        author: 'Test Author',
        path: tempDir,
        interactive: false,
        _: [],
        $0: '',
      };

      await createHandler(argv);

      const skillPath = path.join(tempDir, skillName);

      // Verify directory was created
      expect(fs.existsSync(skillPath)).toBe(true);

      // Verify manifest.json exists
      expect(fs.existsSync(path.join(skillPath, 'manifest.json'))).toBe(true);

      // Verify SKILL.md exists
      expect(fs.existsSync(path.join(skillPath, 'SKILL.md'))).toBe(true);

      // Verify README.md exists
      expect(fs.existsSync(path.join(skillPath, 'README.md'))).toBe(true);

      // Verify subdirectories exist
      expect(fs.existsSync(path.join(skillPath, 'content'))).toBe(true);
      expect(fs.existsSync(path.join(skillPath, 'templates'))).toBe(true);
      expect(fs.existsSync(path.join(skillPath, 'resources'))).toBe(true);

      // Verify manifest.json content
      const manifest = JSON.parse(
        fs.readFileSync(path.join(skillPath, 'manifest.json'), 'utf-8')
      );
      expect(manifest.name).toBe(skillName);
      expect(manifest.description).toBe('A test skill');
      expect(manifest.author.name).toBe('Test Author');
    } finally {
      process.exit = originalExit;
      mockConsoleLog.mockRestore();
    }
  });

  it('should reject invalid skill name', async () => {
    const originalExit = process.exit;
    const mockExit = jest.fn();
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.exit = mockExit as never;

    try {
      const argv: CreateArguments = {
        name: 'InvalidSkillName',  // Invalid: not kebab-case
        description: 'A test skill',
        path: tempDir,
        interactive: false,
        _: [],
        $0: '',
      };

      await createHandler(argv);

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
      mockConsoleError.mockRestore();
    }
  });

  it('should use default values for optional fields', async () => {
    const skillName = 'default-skill';
    const originalExit = process.exit;
    const mockExit = jest.fn();
    jest.spyOn(console, 'log').mockImplementation();

    process.exit = mockExit as never;

    try {
      const argv: CreateArguments = {
        name: skillName,
        path: tempDir,
        interactive: false,
        _: [],
        $0: '',
      };

      await createHandler(argv);

      const skillPath = path.join(tempDir, skillName);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(skillPath, 'manifest.json'), 'utf-8')
      );

      expect(manifest.description).toBe('A new AI agent skill');
      expect(manifest.author.name).toBe('Unknown');
    } finally {
      process.exit = originalExit;
    }
  });
});
