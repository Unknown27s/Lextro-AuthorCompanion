import { logger } from './utils/logger';
import { ErrorCodes, safeAsync } from './utils/errors';
import { hydrateStorage } from './utils/storage';
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
  logger.info(TAG, 'Starting bootstrap (fast path)...');

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

  logger.info(TAG, 'Bootstrap (fast path) complete', { sessionRestored });
  return { dictionaryReady: false, sessionRestored, sqliteReady: false };
}

/**
 * Background warmup — heavy caches that must never block first paint:
 * 1. Seed the prebuilt SQLite DB (native) / import it (web) + mirror saved vocab.
 * 2. Load the in-memory dictionary for practice + purpose feeds.
 * Call once after the app renders, e.g. InteractionManager.runAfterInteractions.
 */
export async function warmup(): Promise<BootstrapResult> {
  logger.info(TAG, 'Starting warmup...');

  // SQLite is the runtime search backend (prebuilt on native), so it warms up
  // cheaply. The 110k in-memory dictionary is deliberately NOT parsed here: it
  // is a lazy fallback loaded on first use, never on the startup path.
  let sqliteReady = false;
  try {
    const savedItems = localStorageApi.getUserVocab();
    // With the prebuilt DB the dictionary is already imported, so skip the
    // full 110k-row import and only mirror saved vocab (web/seed-fallback still
    // needs the in-memory words for the import).
    const alreadyImported = await sqliteService.isImported();
    const words = alreadyImported ? [] : await wordLoadingService.getAllWords();
    sqliteReady = await sqliteService.ensureImported(words, savedItems);
  } catch (error) {
    logger.warn(TAG, 'SQLite warmup failed', error);
    sqliteReady = false;
  }

  const sessionRestored = authService.getCurrentUser() !== null;

  logger.info(TAG, 'Warmup complete', {
    dictionaryReady: false,
    sessionRestored,
    sqliteReady,
  } satisfies BootstrapResult);

  return {
    dictionaryReady: false,
    sessionRestored,
    sqliteReady,
  };
}
