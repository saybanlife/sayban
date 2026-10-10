import { useSyncExternalStore } from "react";

type Listener = () => void;

let attempted = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(listener => listener());
}

/** Shared flag so add-center field UIs can show required errors after Next/Save. */
export const addCenterValidationStore = {
  getAttempted() {
    return attempted;
  },
  setAttempted(next: boolean) {
    if (attempted === next) return;
    attempted = next;
    emit();
  },
  reset() {
    this.setAttempted(false);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export function useAddCenterAttempted() {
  return useSyncExternalStore(
    addCenterValidationStore.subscribe,
    addCenterValidationStore.getAttempted,
    () => false
  );
}

export type AddCenterCredentials = {
  password: string;
  repeatPassword: string;
};

let credentials: AddCenterCredentials = {
  password: "",
  repeatPassword: ""
};
const credentialListeners = new Set<Listener>();

function emitCredentials() {
  credentialListeners.forEach(listener => listener());
}

/**
 * Password for `/panel/center/add` — n8n Register User already reads
 * `body.password`. Kept outside Plasmic state so ownerMode can collect it
 * without regenerating Main.
 */
export const addCenterCredentialsStore = {
  get(): AddCenterCredentials {
    return credentials;
  },
  set(next: Partial<AddCenterCredentials>) {
    credentials = {
      password:
        next.password !== undefined ? String(next.password) : credentials.password,
      repeatPassword:
        next.repeatPassword !== undefined
          ? String(next.repeatPassword)
          : credentials.repeatPassword
    };
    emitCredentials();
  },
  reset() {
    credentials = { password: "", repeatPassword: "" };
    emitCredentials();
  },
  subscribe(listener: Listener) {
    credentialListeners.add(listener);
    return () => {
      credentialListeners.delete(listener);
    };
  }
};

export function useAddCenterCredentials() {
  return useSyncExternalStore(
    addCenterCredentialsStore.subscribe,
    addCenterCredentialsStore.get,
    () => ({ password: "", repeatPassword: "" })
  );
}
