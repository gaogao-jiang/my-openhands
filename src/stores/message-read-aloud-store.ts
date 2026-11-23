import { create } from "zustand";

interface ReadAloudState {
  activeId: string | null;
  play: (
    id: string,
    text: string,
    language: string,
    onError: () => void,
  ) => void;
  stop: (id: string) => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/** One playback owner across all messages; late callbacks cannot stop a new reply. */
export const useMessageReadAloudStore = create<ReadAloudState>((set, get) => ({
  activeId: null,
  stop: (id) => {
    if (get().activeId !== id) return;
    currentUtterance = null;
    set({ activeId: null });
    globalThis.speechSynthesis?.cancel();
  },
  play: (id, text, language, onError) => {
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance)
      return;
    const previous = get().activeId;
    if (previous) get().stop(previous);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    currentUtterance = utterance;
    set({ activeId: id });
    const finish = () => {
      if (currentUtterance !== utterance) return false;
      currentUtterance = null;
      set({ activeId: null });
      return true;
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (
        finish() &&
        event.error !== "canceled" &&
        event.error !== "interrupted"
      )
        onError();
    };
    try {
      speechSynthesis.speak(utterance);
    } catch {
      finish();
      onError();
    }
  },
}));
