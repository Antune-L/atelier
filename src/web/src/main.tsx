import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";
import { applyTheme, getStoredTheme } from "@/lib/theme";

applyTheme(getStoredTheme());

const root = document.getElementById("root");
if (!root) throw new Error("élément #root introuvable");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
