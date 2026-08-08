import { logger } from './utils/logger';
import { ErrorCodes, safeAsync } from './utils/errors';
import { hydrateStorage } from './utils/storage';
import { dictionaryService } from './services/dictionaryService';
import { wordLoadingService } from './services/wordLoadingService';
import { sqliteService } from './services/sqliteService';
import { localStorageApi } from './api/client';
import { responsiveService } from './services/responsiveService';
import { authService } from './services/authService';
import { store } from './store';
import { restoreSession } from './store/authSlice';

export interface BootstrapResult {
  dictionaryReady: boolean;
  sessionRestored: boolean;
  sqliteReady: boolean;
}

const TAG = 'bootstrap';

async function initDictionary(): Promise<boolean> {
  try {
    await safeAsync(() => dictionaryService.initialize(), {
      code: ErrorCodes.DictionaryLoad,
      message: 'Dictionary initialization failed',
    });
    return true;
  } catch (error) {
    logger.error(TAG, 'Dictionary init failed', error);
    return false;
  }
}

function restoreAuthSession(): boolean {
  try {
    const user = authService.getCurrentUser();
    store.dispatch(restoreSession(user));
    return user !== null;
  } catch (error) {
    logger.warn(TAG, 'Session restore failed', error);
    return false;
  }
}

export async function bootstrap(): Promise<BootstrapResult> {
  logger.info(TAG, 'Starting bootstrap...');

  let storageReady = false;
  try {
    await safeAsync(() => hydrateStorage(), {
      code: ErrorCodes.StorageHydration,
      message: 'Storage hydration failed',
    });
    storageReady = true;
  } catch (error) {
    logger.error(TAG, 'Storage hydration failed', error);
  }

  if (!storageReady) {
    return { dictionaryReady: false, sessionRestored: false, sqliteReady: false };
  }

  responsiveService.init();

  const sessionRestored = restoreAuthSession();
  const dictionaryReady = await initDictionary();

  let sqliteReady = false;
  if (dictionaryReady) {
    try {
      const words = await safeAsync(() => wordLoadingService.getAllWords(), {
        code: ErrorCodes.DictionaryLoad,
        message: 'Dictionary read for SQLite import failed',
      });
      const savedItems = localStorageApi.getUserVocab();
      sqliteReady = await sqliteService.ensureImported(words, savedItems);
    } catch (error) {
      logger.warn(TAG, 'SQLite import failed', error);
      sqliteReady = false;
    }
  }

  logger.info(TAG, 'Bootstrap complete', {
    dictionaryReady,
    sessionRestored,
    sqliteReady,
  } satisfies BootstrapResult);

  return { dictionaryReady, sessionRestored, sqliteReady };
}
