import { SkillValidator } from '../../validators/SkillValidator';
import { ValidationError } from '../../types';
import type { Skill } from '../../models/Skill';

describe('SkillValidator', () => {
  let validator: SkillValidator;

  beforeEach(() => {
    validator = new SkillValidator();
  });

  describe('validateMetadata', () => {
    it('should accept a valid skill structure', () => {
      const validSkill: Skill = {
        id: 'my-skill',
        name: 'my-skill',
        version: '1.0.0',
        description: 'A test skill',
        author: { name: 'Test Author' },
        license: 'ISC',
        tags: [],
        schemaVersion: '1.0.0',
        agentSupport: { claude: { supported: true } },
        content: {
          prompts: [],
          workflows: [],
          templates: [],
          resources: [],
        },
      };

      expect(() => validator.validateMetadata(validSkill)).not.toThrow();
    });

    it('should reject a skill with missing id', () => {
      const invalidSkill = {
        name: 'my-skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      expect(() => validator.validateMetadata(invalidSkill)).toThrow(ValidationError);
      expect(() => validator.validateMetadata(invalidSkill)).toThrow(
        'Missing or invalid "id"'
      );
    });

    it('should reject a skill with missing name', () => {
      const invalidSkill = {
        id: 'my-skill',
        version: '1.0.0',
        description: 'A test skill',
      };

      expect(() => validator.validateMetadata(invalidSkill)).toThrow(ValidationError);
      expect(() => validator.validateMetadata(invalidSkill)).toThrow(
        'Missing or invalid "name"'
      );
    });

    it('should reject a skill with missing version', () => {
      const invalidSkill = {
        id: 'my-skill',
        name: 'my-skill',
        description: 'A test skill',
      };

      expect(() => validator.validateMetadata(invalidSkill)).toThrow(ValidationError);
      expect(() => validator.validateMetadata(invalidSkill)).toThrow(
        'Missing or invalid "version"'
      );
    });

    it('should reject a skill with missing description', () => {
      const invalidSkill = {
        id: 'my-skill',
        name: 'my-skill',
        version: '1.0.0',
      };

      expect(() => validator.validateMetadata(invalidSkill)).toThrow(ValidationError);
      expect(() => validator.validateMetadata(invalidSkill)).toThrow(
        'Missing or invalid "description"'
      );
    });

    it('should reject null input', () => {
      expect(() => validator.validateMetadata(null)).toThrow(ValidationError);
      expect(() => validator.validateMetadata(null)).toThrow(
        'Skill metadata must be an object'
      );
    });

    it('should reject non-object input', () => {
      expect(() => validator.validateMetadata('not an object')).toThrow(ValidationError);
      expect(() => validator.validateMetadata(123)).toThrow(ValidationError);
      expect(() => validator.validateMetadata([])).toThrow(ValidationError);
    });
  });

  describe('validateContent', () => {
    it('should return true for valid content path', () => {
      const result = validator.validateContent('/some/path');
      expect(result).toBe(true);
    });
  });
});
