"use client";

import { useWorkspace } from "../../contexts/WorkspaceContext";

export default function ToastContainer() {
  const { toasts, dismissToast } = useWorkspace();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.tone || ""}`}
          onClick={() => dismissToast(toast.id)}
          role="status"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
