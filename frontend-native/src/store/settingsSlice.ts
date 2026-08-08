import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../types';

interface SettingsState {
  learningPurpose: User['learningPurpose'] | null;
  darkMode: boolean;
}

const initialState: SettingsState = {
  learningPurpose: null,
  darkMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLearningPurpose(state, action: PayloadAction<User['learningPurpose']>) {
      state.learningPurpose = action.payload;
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
    resetSettings(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setLearningPurpose,
  setDarkMode,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
