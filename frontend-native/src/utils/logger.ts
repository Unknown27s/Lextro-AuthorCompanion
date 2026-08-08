type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = __DEV__ ? 'debug' : 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

function log(level: LogLevel, tag: string, args: unknown[]): void {
  if (!shouldLog(level)) return;
  const prefix = `[${tag}]`;
  switch (level) {
    case 'debug':
      console.debug(prefix, ...args);
      break;
    case 'info':
      console.log(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, formatArgs(args));
      break;
    case 'error':
      console.error(prefix, formatArgs(args));
      break;
  }
}

export const logger = {
  debug: (tag: string, ...args: unknown[]) => log('debug', tag, args),
  info: (tag: string, ...args: unknown[]) => log('info', tag, args),
  warn: (tag: string, ...args: unknown[]) => log('warn', tag, args),
  error: (tag: string, ...args: unknown[]) => log('error', tag, args),
};
