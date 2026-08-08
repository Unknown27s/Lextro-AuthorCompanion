/**
 * Feed Slice (Redux)
 *
 * Ported from web version — imports VocabItem from centralized types
 * instead of defining a local duplicate interface.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VocabItem } from '../types';

export { VocabItem };

export interface FeedState {
  items: VocabItem[];
  loading: boolean;
}

const initialState: FeedState = {
  items: [],
  loading: false,
};

export const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    addItems: (
      state,
      action: PayloadAction<{ items: VocabItem[]; nextCursor: string | null }>,
    ) => {
      state.items = action.payload.items;
    },
    resetFeed: (state) => {
      state.items = [];
    },
    prependDaily: (state, action: PayloadAction<VocabItem>) => {
      const exists = state.items.some(
        (item) => item.id === action.payload.id,
      );
      if (!exists) {
        state.items.unshift(action.payload);
      }
    },
  },
});

export const { setLoading, addItems, resetFeed, prependDaily } =
  feedSlice.actions;
export default feedSlice.reducer;
