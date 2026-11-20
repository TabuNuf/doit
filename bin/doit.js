#!/usr/bin/env node
// The doit command. Run `node bin/doit.js help`.
import { makeCli } from "../src/root.js";

process.exitCode = makeCli().run(process.argv.slice(2));
