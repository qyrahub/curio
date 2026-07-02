import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { brand } from "./lib/brand";

document.title = brand.name;
{
  let l = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
  l.type = "image/svg+xml";
  l.href = brand.favicon;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
