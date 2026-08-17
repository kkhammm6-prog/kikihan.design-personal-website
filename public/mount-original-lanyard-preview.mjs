import React from "react";
import { createRoot } from "react-dom/client";
import Lanyard from "https://framerusercontent.com/modules/2yubH7XCj0lNQM2KgO3a/Hd0fNQu5yff7kiB1tMm3/Lanyard_Prod.js";

const host = document.querySelector("#original-lanyard-canvas");

if (host) {
  const root = createRoot(host);
  root.render(React.createElement(Lanyard, {
    preview: true,
    cardColor: "rgb(255, 255, 255)",
    stringStyle: {
      type: "image",
      color: "rgb(255, 255, 255)",
      image: { src: "https://framerusercontent.com/images/V8VdbvKWpML0Wc6yCb5a35o.png?width=250&height=50" },
    },
    clipColor: "rgb(120, 120, 120)",
    backgroundColor: "transparent",
    frontImage: { src: "https://framerusercontent.com/images/m91EJRK8ol36ILeDFi7VA7zUg.png?width=710&height=1060" },
    interactive: true,
    gravity: 60,
    startPosition: "right",
    cameraDistance: 12,
    imageSizing: "fit",
    lightingIntensity: 35,
    style: { width: "100%", height: "100%" },
  }));
}
