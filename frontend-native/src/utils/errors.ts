export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
  }

  static from(
    error: unknown,
    code = 'UNKNOWN_ERROR',
    message = 'An unexpected error occurred',
    context?: Record<string, unknown>,
  ): AppError {
    if (error instanceof AppError) return error;
    const detail = error instanceof Error ? error.message : String(error);
    return new AppError(code, `${message}: ${detail}`, { cause: error, context });
  }
}

export const ErrorCodes = {
  StorageHydration: 'STORAGE_HYDRATION_FAILED',
  DictionaryLoad: 'DICTIONARY_LOAD_FAILED',
  DictionaryUnavailable: 'DICTIONARY_UNAVAILABLE',
  ApiNetwork: 'API_NETWORK_ERROR',
  ApiNotFound: 'API_NOT_FOUND',
  AuthRequired: 'AUTH_REQUIRED',
  InvalidInput: 'INVALID_INPUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export async function safeAsync<T>(
  fn: () => Promise<T>,
  options?: { code?: string; message?: string; context?: Record<string, unknown> },
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw AppError.from(error, options?.code, options?.message, options?.context);
  }
}

export function tryCatch<T>(fn: () => T, fallback: T, onError?: (e: unknown) => void): T {
  try {
    return fn();
  } catch (e) {
    onError?.(e);
    return fallback;
  }
}
