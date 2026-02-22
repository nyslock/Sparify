import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  amount?: number;
  pigName?: string;
}

export interface ToastContainerProps {
  notifications: ToastNotification[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastProps {
  notification: ToastNotification;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onRemove }) => {
  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onRemove]);

  const bgColor = {
    success: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    error: 'bg-gradient-to-r from-red-500 to-rose-600',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600'
  }[notification.type];

  const icon = {
    success: <Check size={20} className="text-white" />,
    error: <AlertCircle size={20} className="text-white" />,
    info: <AlertCircle size={20} className="text-white" />
  }[notification.type];

  return (
    <div
      className={`
        ${bgColor} text-white rounded-2xl p-4 shadow-2xl shadow-black/20 backdrop-blur-md
        border border-white/20 transform transition-all duration-300 animate-in slide-in-from-right-full
        pointer-events-auto max-w-xs md:max-w-sm
      `}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">{notification.title}</h3>
          <p className="text-xs opacity-90 mt-0.5">{notification.message}</p>
          {notification.amount !== undefined && notification.amount > 0 && (
            <p className="text-sm font-black mt-2">
              €{notification.amount.toFixed(2)} • {notification.pigName}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className="shrink-0 text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
