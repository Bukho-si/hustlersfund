import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { checkAppVersion, applyVersionUpdate } from "./lib/appVersion";

// App version control — clear cache and reload on version mismatch
const versionCheck = checkAppVersion();
if (versionCheck.needsRefresh) {
  applyVersionUpdate();
  // Show brief message before reload
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:white;font-family:system-ui;flex-direction:column;gap:12px">
      <div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="font-size:14px;opacity:0.8">A new version of Hustlers is available. Refreshing the app.</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `;
  setTimeout(() => window.location.reload(), 800);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
