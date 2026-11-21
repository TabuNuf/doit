# Claude's runs in Marketing

The exact CLI steps Claude follows for the two recurring jobs. `doit` is `node /Users/tabu/Repos/doit/bin/doit.js`. Run `doit help` first when a flag is in doubt. Claude never approves or sends a draft; that is Tabu's, in the page. Linked from `Design.md`, Marketing, item 5.

## Research a batch of contacts

1. List the next batch: `doit contacts --no-about --json`. Take 20 to 30, largest reach first. Skip a contact with no channel URL and say so in the report.
2. For each contact, read its channels: `doit contact show <id> --json`, then open each channel URL and read what the contact makes, for whom, and how often.
3. Write what you found, in one command per contact: `doit contact set <id> about="<one or two sentences: what they make, for whom>" notes="<how to approach, what to avoid>" genres=a,b reach=<followers>`. Use the largest follower count of any channel; leave `reach` alone when none is public.
4. Say which games the contact fits: `doit profiles` lists them, then `doit fit <id> <game> "<reason in one line, naming the shared genre or audience>"`. A fit with no reason is not allowed.
5. Remove a wrong fit: `doit fit <id> <game> --remove`. Check existing fits of every contact in the batch, not only the new ones.
6. Finish with `doit contacts --no-about` to confirm the batch is gone from it, and report how many were researched, fitted and skipped.

## Create and fill a campaign from a release or an event

1. Find the occasion. A release: the project's profile (`doit profiles`) gives stage and release date. An event: `doit festivals --fits <game> --deadline-within 60` lists open events with days left; take its id.
2. Create it: `doit campaign add <project> "<name>" --game <game[,game...]> [--event <festival id|YYYY-MM-DD>] --occasion <release|demo|festival|update|sale|announcement|other> --goal "<outcome>" --change "<from and to>" --measure "<one number and target>" --audience "<who>" --message "<one sentence>" --ask "<what we want them to do>" --channels "<where>" --starts <date> --ends <date> --budget "<amount or none>"`. It prints the epic id.
3. Check it: `doit campaign show <project> <EPIC-nnn>`. Fill a gap with `doit campaign set <project> <EPIC-nnn> key=value`. Ask Tabu for anything you would have to invent (goal numbers, budget, dates).
4. See what fits: `doit campaign suggest <project> <EPIC-nnn> --limit 30`. It lists contacts not yet on the campaign with fit reason and last contact about the game, and open festivals that fit.
5. Add contacts. Either `doit campaign contacts <project> <EPIC-nnn> --limit 10` for the best by reach, or one at a time with `doit add <project> <EPIC-nnn> "Reach out to <name>" --owner human --contact <id>` for ones picked from the suggestions.
6. Add event steps for each fitting festival: `doit add <project> <EPIC-nnn> "Apply to <name>" --owner human --deadline <date>`.
7. Draft the outreach: `doit draft add <contact id> --template <name> --game <game> --personal "<one personal line>"`. `doit templates` lists the templates. Drafts wait for Tabu's approval.
8. Check the week: `doit outreach`. Report the epic id, how many contacts and events were added, and what is missing from the brief.
