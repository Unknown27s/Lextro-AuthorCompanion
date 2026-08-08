export const STORAGE_KEYS = {
  userVocab: 'userVocab',
  wordTrackingData: 'wordTrackingData',
  syncQueue: 'syncQueue',
  exerciseProgress: 'exerciseProgress',
  studyQueue: 'studyQueue',
  reviewSessions: 'reviewSessions',
  statsCache: 'statsCache',
  dictionaryCached: 'dictionary_cached',
  authUser: 'authUser',
  localUsers: 'localUsers',
  appSettings: 'appSettings',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const FEATURE_FLAGS = {
  enableWordnik: true,
  enableDictionaryAsset: true,
  enableDarkMode: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const APP_CONFIG = {
  name: 'Lextro',
  slug: 'lextro',
  version: '1.0.0',
  dictionaryAsset: require('../../assets/dictionary_indexed.json.gz'),
  dictionaryClassifiedAsset: require('../../assets/dictionary_classified.json.gz'),
  pageSize: 10,
  maxSuggestionWords: 3,
  minWordLengthForScan: 5,
} as const;
