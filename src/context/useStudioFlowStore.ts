import { create } from 'zustand';
import { DEV_USER, type Session } from '../mock/seed';

interface StudioFlowState {
  user: typeof DEV_USER;
  selectedSessionId: string | null;
  editingSession: Partial<Session> | null;

  setSelectedSession: (id: string | null) => void;
  setEditingSession: (session: Partial<Session> | null) => void;
  patchEditingSession: (updates: Partial<Session>) => void;
}

export const useStudioFlowStore = create<StudioFlowState>((set) => ({
  user: DEV_USER,
  selectedSessionId: null,
  editingSession: null,

  setSelectedSession: (id) => set({ selectedSessionId: id }),
  setEditingSession: (session) => set({ editingSession: session }),
  patchEditingSession: (updates) =>
    set((state) => ({
      editingSession: state.editingSession
        ? { ...state.editingSession, ...updates }
        : updates,
    })),
}));
