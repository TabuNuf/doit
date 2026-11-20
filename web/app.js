// The board page. Talks to the server's JSON API only; reloads from disk every 10 s.

import { setRenderer, load } from "./state.js";
import { render } from "./render.js";
import { initResize } from "./resize.js";
import "./events.js";

setRenderer(render);
initResize();
load();
