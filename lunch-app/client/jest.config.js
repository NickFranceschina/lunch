module.exports = {
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(axios|react-markdown|remark-gfm)/).+\\.js$"
  ],
  moduleNameMapper: {
    "^axios$": require.resolve("axios")
  }
}; 