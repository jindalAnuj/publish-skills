export class SkillError extends Error {
  constructor(
    public code: string,
    message: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SkillError';
  }
}

export class ValidationError extends SkillError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, context);
    this.name = 'ValidationError';
  }
}

export class PublishError extends SkillError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('PUBLISH_ERROR', message, context);
    this.name = 'PublishError';
  }
}

export class InstallError extends SkillError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('INSTALL_ERROR', message, context);
    this.name = 'InstallError';
  }
}

export class AuthenticationError extends SkillError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, context);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends SkillError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, context);
    this.name = 'NetworkError';
  }
}

export class UserCancelledError extends SkillError {
  constructor(message: string = 'Operation cancelled by user') {
    super('USER_CANCELLED', message, {});
    this.name = 'UserCancelledError';
  }
}

/**
 * Check if an error is a user cancellation (Ctrl+C, Escape, etc.)
 */
export function isUserCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Error & { code?: string };

  // Check for inquirer's ExitPromptError
  if (err.name === 'ExitPromptError') return true;

  // Check for common cancellation patterns
  if (err.message?.includes('force closed')) return true;
  if (err.message?.includes('SIGINT')) return true;
  if (err.message?.includes('cancelled')) return true;

  return false;
}
