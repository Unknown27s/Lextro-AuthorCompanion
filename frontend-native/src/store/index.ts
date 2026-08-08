import { configureStore } from '@reduxjs/toolkit';
import feedReducer from './feedSlice';
import userVocabReducer from './userVocabSlice';
import settingsReducer from './settingsSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    feed: feedReducer,
    userVocab: userVocabReducer,
    settings: settingsReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
