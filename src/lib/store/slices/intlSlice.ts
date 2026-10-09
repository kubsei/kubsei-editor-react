import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LANGUAGES, LanguageKey } from "@/lib/translations";

interface IntlState {
  locale: LanguageKey;
}

const initialState: IntlState = {
  locale: LANGUAGES.es,
};

const intlSlice = createSlice({
  name: "intl",
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<LanguageKey>) => {
      state.locale = action.payload;
    },
  },
});

export const { setLocale } = intlSlice.actions;
export default intlSlice.reducer;
