import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MessageRating = "helpful" | "not-helpful";
const MESSAGE_FEEDBACK_STORAGE_KEY = "message-feedback";
const MAX_SAVED_RATINGS = 500;

interface MessageFeedbackState {
  ratings: Record<string, MessageRating>;
  setRating: (key: string, rating: MessageRating | null) => void;
}

/** Browser-local feedback; no message content or credentials are stored. */
export const useMessageFeedbackStore = create<MessageFeedbackState>()(
  persist(
    (set) => ({
      ratings: {},
      setRating: (key, rating) =>
        set((state) => {
          const ratings = { ...state.ratings };
          delete ratings[key];
          if (rating) ratings[key] = rating;
          for (const oldest of Object.keys(ratings).slice(
            0,
            -MAX_SAVED_RATINGS,
          )) {
            delete ratings[oldest];
          }
          return { ratings };
        }),
    }),
    {
      name: MESSAGE_FEEDBACK_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ ratings }) => ({ ratings }),
    },
  ),
);
