import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => {
            const isError = t.type === 'error';
            const isSuccess = t.type === 'success';
            const bg = isError ? '#fef2f2' : isSuccess ? '#f0fdf4' : '#ffffff';
            const border = isError ? '#fecaca' : isSuccess ? '#bbf7d0' : '#e2e8f0';
            const color = isError ? '#b91c1c' : isSuccess ? '#15803d' : '#0f172a';
            const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info;
            const iconColor = isError ? '#ef4444' : isSuccess ? '#10b981' : '#6366f1';

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                style={{
                  pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12,
                  background: bg, border: `1px solid ${border}`, borderRadius: 8,
                  padding: '12px 16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: 280, maxWidth: 400
                }}
              >
                <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color, flex: 1, lineHeight: 1.4 }}>
                  {t.message}
                </p>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
