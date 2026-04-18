import { create } from "zustand";

import { isBrowser } from "@/shared/lib/browser";

const clientIdKey = "wheeltec.control-client-id";
const clientNameKey = "wheeltec.control-client-name";

function buildClientId() {
  return `web-${Math.random().toString(36).slice(2, 10)}`;
}

function getStoredValue(key: string) {
  if (!isBrowser()) {
    return "";
  }
  return window.localStorage.getItem(key) ?? "";
}

function setStoredValue(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, value);
}

function loadClientIdentity() {
  const storedId = getStoredValue(clientIdKey);
  const clientId = storedId || buildClientId();
  if (!storedId) {
    setStoredValue(clientIdKey, clientId);
  }

  const storedName = getStoredValue(clientNameKey);
  const clientName = storedName || `Console ${clientId.slice(-4).toUpperCase()}`;
  if (!storedName) {
    setStoredValue(clientNameKey, clientName);
  }

  return { clientId, clientName };
}

const identity = loadClientIdentity();

interface ControlArbitrationState {
  clientId: string;
  clientName: string;
  wantsControl: boolean;
  takeoverNonce: number;
  setClientName: (name: string) => void;
  setWantsControl: (wantsControl: boolean) => void;
  requestTakeover: () => void;
}

export const useControlArbitrationStore = create<ControlArbitrationState>((set) => ({
  clientId: identity.clientId,
  clientName: identity.clientName,
  wantsControl: true,
  takeoverNonce: 0,
  setClientName: (clientName) => {
    const normalized = clientName.trim() || identity.clientName;
    setStoredValue(clientNameKey, normalized);
    set({ clientName: normalized });
  },
  setWantsControl: (wantsControl) => set({ wantsControl }),
  requestTakeover: () =>
    set({
      wantsControl: true,
      takeoverNonce: Date.now(),
    }),
}));
