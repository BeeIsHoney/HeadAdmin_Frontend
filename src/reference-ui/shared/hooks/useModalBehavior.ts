import { useEffect, useRef } from 'react';
import { lockPageScroll } from '../utils/pageScrollLock';

export const useModalBehavior = (isOpen: boolean, onClose: () => void): void => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const unlockScroll = lockPageScroll();
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [isOpen]);
};
