"use strict";

const { createServer } = require("./src/server");

const PORT = process.env.PORT || 3000;

const server = createServer();

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
