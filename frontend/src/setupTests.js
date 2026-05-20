import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

/* eslint-disable no-undef */
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
/* eslint-enable no-undef */

// Suppress React Router v7 Future Flag warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("React Router Future Flag Warning")
  ) {
    return;
  }
  originalWarn(...args);
};
