#!/usr/bin/env node
// Starts the board server on 127.0.0.1 (DOIT_PORT, default 4317).
import { makeServer } from "../src/root.js";

const port = Number(process.env.DOIT_PORT) || 4317;
const server = makeServer();
server.listen(port).then(() => console.log(`Doit: http://localhost:${port}`));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close().then(() => process.exit(0)));
