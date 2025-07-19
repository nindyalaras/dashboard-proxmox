const { defineConfig } = require("cypress");
const fs = require('fs');

module.exports = defineConfig({
  projectId: 'n1k3wf',
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        truncateFile(path) {
          // path: string relatif ke root project (bisa absolute juga)
          fs.writeFileSync(path, '[]', 'utf8'); // Kosongkan file
          return null;
        }
      });
    },
  },
});
