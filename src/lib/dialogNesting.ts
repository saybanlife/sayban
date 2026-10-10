/**
 * Tracks the stack of currently open Sayban dialogs.
 *
 * Nested dialogs (pickers, «رزرو برای دیگری», …) often sit on top of a parent
 * dialog. Radix still fires outside-dismiss on the parent when the child closes
 * or when the user interacts inside the child. If the parent accepts that
 * dismiss, the whole stack collapses.
 *
 * Only non-topmost dialogs ignore dismiss. After a nested child releases, a
 * short grace window also blocks the parent from treating the child's teardown
 * as an intentional outside-click.
 */

export type OpenDialogHandle = {
  /** True while this retain is the uppermost open dialog. */
  isTopmost: () => boolean;
  /** Drop this dialog from the stack (close / unmount). */
  release: () => void;
};

const stack: symbol[] = [];
const listeners = new Set<() => void>();
let nestedDismissGraceUntil = 0;

function emit() {
  listeners.forEach(listener => listener());
}

export function getOpenDialogCount() {
  return stack.length;
}

export function subscribeOpenDialogCount(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True for a brief window after a nested (non-topmost) dialog releases. */
export function isInNestedDismissGrace() {
  return Date.now() < nestedDismissGraceUntil;
}

function beginNestedDismissGrace(ms = 220) {
  nestedDismissGraceUntil = Math.max(nestedDismissGraceUntil, Date.now() + ms);
}

/** Call while a dialog is open; returns helpers for close/unmount. */
export function retainOpenDialog(): OpenDialogHandle {
  const id = Symbol("sayban-dialog");
  stack.push(id);
  emit();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const index = stack.lastIndexOf(id);
    if (index < 0) return;
    const wasNested = stack.length > 1;
    stack.splice(index, 1);
    emit();
    // Parent often receives Radix onOpenChange(false) in the same turn the
    // child unmounts — keep it from treating that as a real dismiss.
    if (wasNested) beginNestedDismissGrace();
  };

  return {
    isTopmost: () => !released && stack[stack.length - 1] === id,
    release
  };
}
