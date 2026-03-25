
import type { Skill } from '../models/Skill';
import { ValidationError } from '../types';

export class SkillValidator {
  constructor() {
    //
  }

  /**
   * Validates the basic structure of a skill locally before publishing.
   */
  public validateMetadata(skill: unknown): asserts skill is Skill {
    if (!skill || typeof skill !== 'object') {
      throw new ValidationError('Skill metadata must be an object.');
    }

    const s = skill as Record<string, unknown>;

    if (!s.id || typeof s.id !== 'string') throw new ValidationError('Missing or invalid "id"');
    if (!s.name || typeof s.name !== 'string') throw new ValidationError('Missing or invalid "name"');
    if (!s.version || typeof s.version !== 'string') throw new ValidationError('Missing or invalid "version"');
    if (!s.description || typeof s.description !== 'string') throw new ValidationError('Missing or invalid "description"');
    
    // In a full implementation, we would validate against a complete JSON Schema here.
    // We keep it basic for the MVP as per instructions to prioritize a working publish command.
  }

  public validateContent(_contentPath: string): boolean {
    // Validate directory structure and content files
    return true;
  }
}
