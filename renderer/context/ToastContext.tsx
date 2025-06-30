import React, { createContext, ReactNode, useContext, useReducer } from "react";

// Toast types
export type ToastType = "info" | "destructive";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Toast actions
export type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: number }
  | { type: "CLEAR_TOASTS" };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast];
    case "REMOVE_TOAST":
      return state.filter((t) => t.id !== action.id);
    case "CLEAR_TOASTS":
      return [];
    default:
      return state;
  }
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    dispatch({ type: "ADD_TOAST", toast: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: "REMOVE_TOAST", id });
    }, 4000);
  };

  const clearToasts = () => dispatch({ type: "CLEAR_TOASTS" });

  return (
    <ToastContext.Provider value={{ showToast, clearToasts }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: 200,
              padding: "12px 20px",
              borderRadius: 8,
              color: "#fff",
              background:
                toast.type === "destructive"
                  ? "#e74c3c"
                  : "#333",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontWeight: 500,
              fontSize: 16,
              opacity: 0.95,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 