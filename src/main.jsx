import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { ReelGame } from "./engine/index.js";
import { fruityPuppy } from "./themes/fruity-puppy.js";

createRoot(document.getElementById("root")).render(
  <ReelGame theme={fruityPuppy} />
);
