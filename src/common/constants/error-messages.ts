import { ErrorCode } from './error-codes';

export const ErrorMessage: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token expired',
    [ErrorCode.ORG_FORBIDDEN]: 'Not permitted for this organization',
    [ErrorCode.FORBIDDEN]: 'Forbidden',
    [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found',
    [ErrorCode.AGENT_CORE_TIMEOUT]: 'Agent core timed out',
    [ErrorCode.AGENT_CORE_UNAVAILABLE]: 'Agent core unavailable',
    [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
    [ErrorCode.BAD_REQUEST]: 'Bad request',
    [ErrorCode.UNAUTHORIZED]: 'Unauthorized',
    [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests',
    [ErrorCode.GONE]: 'Resource is gone',
    [ErrorCode.INTERNAL_UNEXPECTED]: 'Unexpected error',
    [ErrorCode.AGENT_ORIGIN_REQUIRED]: 'Origin header required for domain-restricted agents',
    [ErrorCode.AGENT_ORIGIN_NOT_PERMITTED]: 'This domain is not permitted to use this agent',
    [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
    [ErrorCode.RESOURCE_CONFLICT]: 'Resource already exists',
};