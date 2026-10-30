export abstract class ApplicationError extends Error {
  abstract readonly statusCode: number;
  readonly isOperational: boolean = true;
  readonly details?: Record<string, unknown> | Array<unknown>;

  constructor(message: string, details?: Record<string, unknown> | Array<unknown>) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApplicationError {
  readonly statusCode = 400;
}

export class UnauthorizedError extends ApplicationError {
  readonly statusCode = 401;
  constructor(message = 'Unauthorized access') {
    super(message);
  }
}

export class ForbiddenError extends ApplicationError {
  readonly statusCode = 403;
  constructor(message = 'Access forbidden') {
    super(message);
  }
}

export class NotFoundError extends ApplicationError {
  readonly statusCode = 404;
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
  }
}

export class ConflictError extends ApplicationError {
  readonly statusCode = 409;
}

export class UnprocessableEntityError extends ApplicationError {
  readonly statusCode = 422;
}

export class RateLimitExceededError extends ApplicationError {
  readonly statusCode = 429;
  constructor(message = 'Rate limit exceeded. Please try again later.') {
    super(message);
  }
}

export class InternalServerError extends ApplicationError {
  readonly statusCode = 500;
  readonly isOperational = false;
  constructor(message = 'An unexpected internal server error occurred') {
    super(message);
  }
}
