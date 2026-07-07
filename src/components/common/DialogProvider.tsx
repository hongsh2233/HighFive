'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal } from './Modal';
import styles from './DialogProvider.module.css';

interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alertDialog: (message: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type PendingDialog =
  | { type: 'confirm'; message: string; options?: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: 'alert'; message: string; resolve: () => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ type: 'confirm', message, options, resolve });
    });
  }, []);

  const alertDialog = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setPending({ type: 'alert', message, resolve });
    });
  }, []);

  const resolvePending = (result: boolean) => {
    if (!pending) return;
    if (pending.type === 'confirm') pending.resolve(result);
    else pending.resolve();
    setPending(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, alertDialog }}>
      {children}
      <Modal open={!!pending} onClose={() => resolvePending(false)} maxWidth={360}>
        {pending && (
          <div className={styles.body}>
            <p className={styles.message}>{pending.message}</p>
            <div className={styles.actions}>
              {pending.type === 'confirm' && (
                <button type="button" className={styles.cancelBtn} onClick={() => resolvePending(false)}>
                  {pending.options?.cancelText ?? '취소'}
                </button>
              )}
              <button type="button" className={styles.confirmBtn} onClick={() => resolvePending(true)}>
                {pending.type === 'confirm' ? (pending.options?.confirmText ?? '확인') : '확인'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog는 DialogProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
