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
