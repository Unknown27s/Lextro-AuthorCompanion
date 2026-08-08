import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../types';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<User>) {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    restoreSession(state, action: PayloadAction<User | null>) {
      state.isAuthenticated = action.payload !== null;
      state.user = action.payload;
      state.error = null;
    },
  },
});

export const { loginSuccess, logout, setAuthError, restoreSession } = authSlice.actions;

export default authSlice.reducer;
