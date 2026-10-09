import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import intlReducer from './slices/intlSlice';
import syncReducer from './slices/syncSlice';
import { syncMiddleware } from './middleware/syncMiddleware';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    intl: intlReducer,
    sync: syncReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
