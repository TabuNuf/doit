# Claude's runs in Marketing

The exact CLI steps Claude follows for the two recurring jobs. `doit` is `node /Users/tabu/Repos/doit/bin/doit.js`. Run `doit help` first when a flag is in doubt. Claude never approves or sends a draft; that is Tabu's, in the page. Linked from `Design.md`, Marketing, item 5.

## Research a batch of contacts

1. List the next batch: `doit contacts --no-about --json`. Take 20 to 30, largest reach first. Skip a contact with no channel URL and say so in the report.
2. For each contact, read its channels: `doit contact show <id> --json`, then open each channel URL and read what the contact makes, for whom, and how often.
3. Write what you found, in one command per contact: `doit contact set <id> about="<one or two sentences: what they make, for whom>" notes="<how to approach, what to avoid>" genres=a,b reach=<followers>`. Use the largest follower count of any channel; leave `reach` alone when none is public.
4. Say which games the contact fits: `doit profiles` lists them, then `doit fit <id> <game> "<reason in one line, naming the shared genre or audience>"`. A fit with no reason is not allowed.
5. Remove a wrong fit: `doit fit <id> <game> --remove`. Check existing fits of every contact in the batch, not only the new ones.
6. Finish with `doit contacts --no-about` to confirm the batch is gone from it, and report how many were researched, fitted and skipped.

## Research a batch of covered games

The Games tab compares Tabu's games with the games the contacts covered. This run fills each entry from the sites that track games. Never write a number from memory: every figure comes from a page opened in this run.

1. List the next batch: `doit games --no-facts --json`. Take 10 to 15, most covered first.
2. For each game, find its pages. Stores: Steam, Epic, GOG, itch and the console stores. Trackers: `https://gamalytic.com/` and `https://steamdb.info/` for a Steam game, `https://www.vgchartz.com/gamedb/` for a console one, and SteamSpy, SteamCharts, Metacritic, OpenCritic, HowLongToBeat and IGDB where they have the game.
3. Write the links first, one key per link: `doit game set "<title>" store=steam=<url> store=gog=<url> tracker=gamalytic=<url> tracker=steamdb=<url>`. Kinds are in `doit help`. A site that does not have the game gets no link.
4. Write what the game is, from the store page: `doit game set "<title>" developer="<name>" publisher="<name>" release=<YYYY-MM-DD> stage=<unreleased|demo|early-access|released> platforms=pc,switch description="<two or three lines>" hook="<one sentence: what sets it apart>" genres=a,b keywords=a,b scale=<solo,indie,triple-i,aa,aaa> modes=single-player,co-op look="<2D or 3D, art style, camera>"`.
5. Write how it did, from the trackers: `doit game set "<title>" price=<usd> launch_price=<usd> reviews=<n> rating=<percent positive> rating_label="<Very Positive>" metacritic=<n> opencritic=<n> sales=<copies> revenue=<usd> sales_source=<tracker kind> peak_players=<n> followers=<n> playtime=<median hours>`. `sales` and `revenue` are refused without `sales_source`. Leave a key out when no tracker gives it; the page then shows the reviews estimate.
6. Write how it got there, each from a source: `doit game set "<title>" team="<size>" dev_time="<years>" demo=<yes|no> festivals="<names>" early_access="<length>" languages=<n> worked="<the marketing beat that moved it>" sources=<url>,<url>`.
7. Mark comparisons: `doit profiles` lists Tabu's games, then `doit game comp "<title>" <game> "<reason in one line: the shared genre, scale or audience>"`. `doit game comp "<title>" <game> --remove` drops one.
8. Close each entry with `doit game set "<title>" checked=<today>`. Finish with `doit games --no-facts` to confirm the batch is gone from it, and report how many were researched, which sites had no page for which game, and which numbers were left empty.

## Create and fill a campaign from a release or an event

1. Find the occasion. A release: the project's profile (`doit profiles`) gives stage and release date. An event: `doit festivals --fits <game> --deadline-within 60` lists open events with days left; take its id.
2. Create it: `doit campaign add <project> "<name>" --game <game[,game...]> [--event <festival id|YYYY-MM-DD>] --occasion <release|demo|festival|update|sale|announcement|other> --goal "<outcome>" --change "<from and to>" --measure "<one number and target>" --audience "<who>" --message "<one sentence>" --ask "<what we want them to do>" --channels "<where>" --starts <date> --ends <date> --budget "<amount or none>"`. It prints the epic id.
3. Check it: `doit campaign show <project> <EPIC-nnn>`. Fill a gap with `doit campaign set <project> <EPIC-nnn> key=value`. Ask Tabu for anything you would have to invent (goal numbers, budget, dates).
4. See what fits: `doit campaign suggest <project> <EPIC-nnn> --limit 30`. It lists contacts not yet on the campaign with fit reason and last contact about the game, and open festivals that fit.
5. Add contacts. Either `doit campaign contacts <project> <EPIC-nnn> --limit 10` for the best by reach, or one at a time with `doit add <project> <EPIC-nnn> "Reach out to <name>" --owner human --contact <id>` for ones picked from the suggestions.
6. Add event steps for each fitting festival: `doit add <project> <EPIC-nnn> "Apply to <name>" --owner human --deadline <date>`.
7. Draft the outreach: `doit draft add <contact id> --template <name> --game <game> --personal "<one personal line>"`. `doit templates` lists the templates. Drafts wait for Tabu's approval.
8. Check the week: `doit outreach`. Report the epic id, how many contacts and events were added, and what is missing from the brief.
