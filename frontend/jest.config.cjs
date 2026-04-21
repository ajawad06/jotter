module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx"],
  testMatch: ["**/?(*.)+(test).[jt]s?(x)"],
  collectCoverageFrom: ["src/**/*.{js,jsx}", "!src/main.jsx"],
};
