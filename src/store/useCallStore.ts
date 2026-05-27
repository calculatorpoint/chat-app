import { create } from 'zustand';

export interface CallStateData {
  callId: string | null;
  remoteUserId: string | null;
  isIncoming: boolean;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
}

interface CallStore extends CallStateData {
  setCallState: (data: Partial<CallStateData>) => void;
  resetCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const initialState: CallStateData = {
  callId: null,
  remoteUserId: null,
  isIncoming: false,
  status: 'idle',
  isMuted: false,
  isVideoOff: false,
};

export const useCallStore = create<CallStore>((set) => ({
  ...initialState,
  setCallState: (data) => set((state) => ({ ...state, ...data })),
  resetCall: () => set(initialState),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
}));
