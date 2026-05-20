module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(jspdf|canvg|html2canvas|dompurify)/)",
  ],
  testMatch: ["**/?(*.)+(test).[jt]s?(x)"],
  collectCoverageFrom: ["src/**/*.{js,jsx}", "!src/main.jsx"],
};
