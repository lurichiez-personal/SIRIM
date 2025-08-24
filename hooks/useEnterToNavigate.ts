import { RefObject, useCallback, useEffect } from 'react';

export function useEnterToNavigate(formRef: RefObject<HTMLFormElement>) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && formRef.current) {
      const target = event.target as HTMLElement;
      
      // Don't navigate from textareas or submit buttons
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) {
        return;
      }
      
      event.preventDefault();

      const focusableElements = Array.from(
        formRef.current.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      ) as HTMLElement[];

      const currentIndex = focusableElements.indexOf(target);
      const nextElement = focusableElements[currentIndex + 1];

      if (nextElement) {
        nextElement.focus();
      } else {
        // If we're at the last element, find and click the primary submit button
        const submitButton = formRef.current.querySelector('button[type="submit"], button:not([type])') as HTMLButtonElement | null;
        submitButton?.click();
      }
    }
  }, [formRef]);

  useEffect(() => {
    const form = formRef.current;
    if (form) {
      form.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (form) {
        form.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [formRef, handleKeyDown]);
}