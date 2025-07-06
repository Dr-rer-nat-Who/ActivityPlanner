module.exports = {
  ci: {
    collect: {
      startServerCommand: 'PORT=3333 node index.js',
      startServerReadyPattern: 'Server started',
      url: ['http://localhost:3333'],
      numberOfRuns: 1
    },
    assert: {
      budgetsFile: 'budget.json'
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
