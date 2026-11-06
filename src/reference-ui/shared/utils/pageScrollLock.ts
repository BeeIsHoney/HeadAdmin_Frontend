let activeLocks = 0;
let lockedRoot: HTMLElement | null = null;
let previousBodyOverflow = '';
let previousRootOverflow = '';

export const lockPageScroll = (): (() => void) => {
  if (typeof document === 'undefined') return () => undefined;

  if (activeLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    lockedRoot = document.querySelector<HTMLElement>('[data-admin-scroll-root="true"]');
    previousRootOverflow = lockedRoot?.style.overflow ?? '';

    document.body.style.overflow = 'hidden';
    if (lockedRoot) lockedRoot.style.overflow = 'hidden';
  }

  activeLocks += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks !== 0) return;

    document.body.style.overflow = previousBodyOverflow;
    if (lockedRoot) lockedRoot.style.overflow = previousRootOverflow;
    lockedRoot = null;
    previousBodyOverflow = '';
    previousRootOverflow = '';
  };
};
