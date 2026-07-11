import React from "react";
import ReactDOM from "react-dom/client";

import "./css/global.css";

import App from "./App";

// Prevent accidental double clicks on buttons globally (e.g. within 800ms)
document.addEventListener("click", (e) => {
    const button = e.target.closest("button, input[type='submit'], [role='button']");
    if (!button) return;

    const now = Date.now();
    const lastClick = button.getAttribute("data-last-click");
    
    if (lastClick && (now - parseInt(lastClick)) < 800) {
        e.preventDefault();
        e.stopPropagation();
        console.warn("[Double Click Prevented]", button);
        return;
    }
    
    button.setAttribute("data-last-click", now);
}, true);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);