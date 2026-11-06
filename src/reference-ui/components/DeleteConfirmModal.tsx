import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Delete',
  confirmDisabled = false,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitInFlightRef = React.useRef(false);
  const [submitError, setSubmitError] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
      setSubmitError('');
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!submitInFlightRef.current) onClose();
  };

  const handleConfirm = async () => {
    if (submitInFlightRef.current || confirmDisabled) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm();
    } catch {
      setSubmitError('Unable to complete this action. Please try again.');
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-all select-none">
        <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={handleClose} disabled={isSubmitting} />
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          className="relative z-10 w-full max-w-[400px] bg-[#121212] text-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/15 select-text overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-busy={isSubmitting}
        >
          <div className="flex flex-col items-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>

            {children && (
              <div className="bg-black/20 border border-white/5 rounded-lg w-full p-4 mb-4 text-left">
                {children}
              </div>
            )}

            <p className="text-sm text-white/60 mb-6">
              {description}
            </p>
            {submitError && <p role="alert" className="w-full -mt-3 mb-4 text-xs text-rose-300">{submitError}</p>}

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 glass-effect-btn text-sm py-2 text-white/80 hover:text-white border border-white/10 hover:border-white/20 cursor-pointer rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirm(); }}
                disabled={isSubmitting || confirmDisabled}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm py-2 rounded-lg font-bold shadow-lg transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
