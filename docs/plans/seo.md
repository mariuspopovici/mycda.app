# Search ranking plan

As of 2026-11-01. How MyCdA compares with what ranks for the searches riders make, and the plan to get found. The technical groundwork (prerendered public pages, per-page metadata, sitemap, real 404s) shipped in [#50](https://github.com/mariuspopovici/mycda.app/pull/50) and [#51](https://github.com/mariuspopovici/mycda.app/pull/51); see [architecture/seo.md](../architecture/seo.md).

## Where we stand

**Google has indexed the site; it doesn't rank for these searches yet.** Until 2026-10-19 every URL returned an empty shell. After the prerendering deploy and sitemap submission, Search Console lists **17 indexed pages** by 2026-10-24: all 15 sitemap pages plus `/login` and `/signup`. In web searches on 2026-11-01 for the queries below, no page on mycda.app appeared. MyCdA showed up only through its GitHub repo, a mirror of it, and forum posts recommending it. Being indexed only lets a page be shown. From here, position depends on relevance, content and links (steps 1–3).

**How this was measured:** a general web search API (US results), not Google, and without positions. Treat the tables as "who shows up", not as rankings. Search Console's Performance report gives the real queries, impressions and positions.

## Who ranks, by search intent

| Riders search for | What shows up | What those pages have that we don't |
|---|---|---|
| **CdA calculator** (power meter, cycling) | myWindsock, PowerBike Pro, Roadman tools, prommer.net, and several AI-generated calculator sites on `pages.dev` | A page whose title *is* "CdA calculator" and that works without signing up |
| **Virtual elevation / Chung method** | Silca's "At Home Aero Testing: A Guide to the Chung Method", Slowtwitch's Platypus thread, Fitwerx, Rule28, raceyourtrack, Athletic Mentors, the intervals.icu "Aero analysis tools" thread, Golden Cheetah | Long explanatory articles. MyCdA is *mentioned* in these threads, but we have no page explaining the method |
| **How to measure CdA / aero field test** | afasteryou (aeroTEST: guides dated 2026, in 6 languages, with figures from their own test data), Roadman Cycling, Cycling Weekly, Martin et al. (sportsci.org) | Protocol articles with original numbers, such as run-to-run scatter by road type |
| **Aero testing app** | myWindsock, aeroAPP (Garmin Connect IQ), Bike CdaCrr, Aerosensor, Body Rocket, mostly via Cycling Weekly and Slowtwitch | Press coverage and product roundups |
| **Golden Cheetah Aerolab alternative (online)** | **Nobody.** Generic Golden Cheetah alternatives (alternativeto.net, Product Hunt) and forum threads; no web-based Aerolab equivalent is named | That's us, and nobody says so |
| **What is a good CdA** | afasteryou, tri247, Competitive Cyclist, Best Bike Split, myWindsock ("How does your CdA compare?") | Typical values by position, ideally from real data |
| **Watts saved by CdA** | Calculator sites, Roadman, myWindsock, Slowtwitch | A small calculator answering "how many watts is 0.01 CdA?" |
| **Air density calculator (cycling)** | Omni Calculator dominates; few pages are cycling-specific. Our own npm package `@mariuspopovici/rho` shows up | A title that says "for cycling", and links from the package |

**myWindsock** is the most direct competitor in search. It has a CdA calculator from ride files plus weather, and dozens of short articles answering one question each ("How does myWindsock know my CdA?", "Why isn't my CdA static?", "Extracting CdA from a time trial"). **afasteryou** wins the guide searches with fresh, data-backed, translated articles.

## What our pages say today

Our 16 public pages describe *how to use MyCdA*. Searchers ask *how to measure CdA*. Counted across the landing page, FAQ, About and guide:

- **Strong:** CdA (110+ mentions), Crr, virtual elevation, out-and-back.
- **Thin or missing:** "Chung" (3 mentions), "Golden Cheetah" and "Aerolab" (0), "aero test" (0), "what is a good CdA" (0), "triathlon" (0), "time trial" (2), "watts saved" (barely).
- **Titles name app features, not questions:** "The Tests table – user guide", "Analyzing a run", "Collecting test data". Nobody searches for those.
- **The FAQ has 4 questions,** all about using the app.

## Should we add more popular keywords?

**Yes, in titles, headings and first paragraphs, and by answering the questions behind them. Not by repeating words.**

Search engines rank the page that best answers a query, from sites other sites point to. That leaves three levers:

1. **Relevance:** a page exists whose title and content match the question ("How to do an aero field test", "The Chung method explained"). We're missing these pages more than we're missing words.
2. **Original substance:** something worth linking to that the others don't have. We have unusual assets: a working virtual-elevation engine, a wind model, a tests table, and an anonymous pool of real field tests.
3. **Authority:** links and mentions from cycling sites. The calculator sites rank on exact-match titles alone, but that tends not to last. Real links do.

**Avoid:**
- keyword stuffing;
- mass-produced or AI-filler articles (Google's helpful-content system demotes whole sites for it);
- buying links;
- translating thin pages.

## The plan

### 0. Measure (you)

- [x] **Google Search Console:** property added and sitemap submitted; 17 pages indexed by 2026-10-24.
- [ ] **Bing Webmaster Tools:** import the site from Search Console. Bing also feeds DuckDuckGo and several AI search tools.
- [ ] **`rho` npm package:** set its `homepage` to `https://mycda.app/rho`. It ranks for "air density calculator", and today it links only to GitHub.
- [ ] **Baseline:** from Search Console → Performance → Search results (last 28 days), note in `docs/log/` the queries with impressions, the average position of each, and which pages they land on, then review monthly. Queries at positions 8–20 are the quickest wins: retitling and extending those pages (step 1) can move them onto page one.

### 1. Match the words people search (code, 1–2 days)

- [ ] **Titles and descriptions.** Keep the slugs, since URLs are linked from the app and announcements; change the page titles, H1s or subtitles, and descriptions:

  | Page | Today | Proposed title |
  |---|---|---|
  | `/` | MyCdA – field testing for cycling aerodynamics | **MyCdA – free CdA calculator for cycling aero field tests** |
  | `/guide/collecting-data` | Collecting test data | **How to do an aero field test: a CdA test protocol** |
  | `/guide/analysis` | Analyzing a run | **Virtual elevation (Chung method) analysis** |
  | `/guide/comparing` | Comparing setups | **Comparing aero setups: watts and seconds saved** |
  | `/guide/tests` | The Tests table | **Out-and-back aero tests, fitted automatically** |
  | `/rho` | Air density calculator | **Air density calculator for cycling (rho)** |

- [ ] **Landing page:** one paragraph under the hero naming what riders search for: CdA and Crr from a power meter, the Chung virtual elevation method, out-and-back and loop protocols, and "an online alternative to Golden Cheetah's Aerolab".
- [ ] **FAQ, up from 4 questions to about 10.** Each answer is short and links to the guide:
  - What is a good CdA? (typical ranges by position);
  - How accurate is field testing compared with a wind tunnel?;
  - Is MyCdA an alternative to Golden Cheetah's Aerolab?;
  - Do I need a speed sensor, or is GPS enough?;
  - Can I use files from Strava, Garmin Connect or Wahoo?;
  - How many watts is 0.01 m² of CdA?
- [ ] **Internal links** from the landing page and FAQ into the guide, with descriptive link text ("CdA test protocol", not "read more").

### 2. Original content (weeks; one article every 1–2 weeks)

A small **Learn** section of prerendered, evergreen articles. They go in `PUBLIC_PAGES` and the sitemap, each written for one search intent where we can say something the others can't. They should have a byline and a date, real charts, and worked examples from real rides, referred to by file ID and never by place.

1. **The Chung method (virtual elevation) explained, with an interactive chart.** Drag the CdA slider on a sample ride and watch the profile tilt. It reuses the analysis chart and `core/virtualElevation.ts`. Interactive explainers earn links, and this one targets the virtual-elevation cluster, where only forum threads and a few blog posts compete.
2. **Try it without an account:** a public demo analysis of a sample ride (we already ship `mycda-example.csv`). It answers "virtual elevation calculator online" and "Aerolab alternative", and lets visitors try the app before signing up.
3. **What's a good CdA? Real values from MyCdA tests.** Ranges by position and bike type from **anonymous, aggregated** saved analyses. That's original data nobody else has, which is what afasteryou's articles do for them. It needs a privacy check first: aggregate only, minimum group sizes, and an update to the privacy policy (or an opt-in) before publishing. Worth an ADR.
4. **Golden Cheetah Aerolab vs MyCdA:** an honest comparison: what each does, and when to use which. This is the only page that will rank for the "Aerolab alternative" gap.
5. **Loop, out-and-back or half-pipe? Choosing a test protocol.** How each one cancels wind and slope, using our wind model and tests table, with worked numbers.
6. **How many watts is 0.01 m² of CdA? A watts-saved calculator.** A small public tool page (speed, air density, CdA change → watts and seconds per 40 km). Calculator pages attract both searches and links.
7. **Air density for aero testing: why 3 % matters.** It pairs with `/rho` and covers station versus sea-level pressure, which the Golden Cheetah users group asks about.

### 3. Links and mentions (ongoing)

- [ ] **Announce the relaunch where MyCdA is already mentioned:** Slowtwitch's Platypus thread, the intervals.icu "Aero analysis tools" thread, the Golden Cheetah users group, TrainerRoad's forum, r/Velo and r/triathlon. Be transparent that you're the developer, and post useful answers rather than ads.
- [ ] **Listings:** add MyCdA on alternativeto.net as an alternative to Golden Cheetah, since that page ranks for the gap. Then Product Hunt.
- [ ] **Press:** pitch the free, no-hardware angle to writers who cover DIY aero testing: Cycling Weekly (it has run two such pieces), Roadman Cycling, tri247, DC Rainmaker.
- [ ] **Integration:** intervals.icu users asked for a Chung-method tool. A "send to MyCdA" link or an import from intervals.icu would earn a link from a busy community.
- [ ] Share each new Learn article on Instagram and in the user community.

## What to expect

- **Within 2–6 weeks of indexing (from late October 2026):** branded and niche searches ("mycda", "Chung method tool", "virtual elevation online").
- **Within 2–4 months, as articles 1, 2 and 4 publish and mentions accumulate:** the method and protocol clusters.
- **6 months or more, needing links:** "CdA calculator" and "aero testing app", where myWindsock and the press roundups are entrenched.

## Order of work

0 now → 1 next (one PR) → articles 1, 2 and 4 first, because each fills a gap no competitor covers → article 3 once its privacy check is done → the rest as time allows. Step 3 runs alongside, timed to each release or article.

## Sources (searched 2026-11-01)

[myWindsock: How does myWindsock know my CdA?](https://mywindsock.com/page/discussion/how-does-mywindsock-know-my-cda/) · [myWindsock: How does your CdA compare?](https://mywindsock.com/page/?p=2613) · [afasteryou: aeroTEST guide](https://afasteryou.com/blog/en/aerotest-guide/) · [afasteryou: Outdoor aero testing, why your road matters](https://afasteryou.com/blog/en/outdoor-aero-testing-road-matters/) · [Silca: A guide to the Chung method](https://silca.cc/blogs/silca/chunging-with-robert-chung) · [Slowtwitch: Platypus thread](https://forum.slowtwitch.com/t/platypus-thread-aero-virtual-elevation-testing-protocol/552756?page=5) · [intervals.icu: Aero analysis tools](https://forum.intervals.icu/t/aero-analysis-tools/2611) · [Roadman: Aero testing without a wind tunnel](https://roadmancycling.com/blog/cycling-aero-testing-without-wind-tunnel-guide) · [Cycling Weekly: Save 10 watts with real-world aero testing](https://cyclingweekly.com/products/how-to-save-10-watts-and-a-lot-of-money-by-doing-your-own-real-world-aero-testing) · [Cycling Weekly: The cost-free aero test](https://cyclingweekly.com/fitness/gain-without-pain-heres-the-cost-free-aero-test-that-every-cyclist-should-try) · [Martin et al. 2006 (sportsci.org)](https://www.sportsci.org/2006/jcm.pdf) · [alternativeto.net: Golden Cheetah alternatives](https://alternativeto.net/software/golden-cheetah/) · [tri247: What is CdA](https://tri247.com/triathlon-training/what-is-cda-in-cycling-triathlon-bike-aerodynamics-drag-aero-gear-riding-position) · [Best Bike Split: CdA explained](https://www.bestbikesplit.com/cda-aerodynamic-drag-coefficient-cycling) · [Omni Calculator: Air density](https://www.omnicalculator.com/physics/air-density) · [npm: @mariuspopovici/rho](https://npmjs.com/package/@mariuspopovici/rho) · [PowerBike Pro: Aerodynamic drag](https://sites.google.com/view/powerbikepro/blog-en/aerodynamic-drag) · [Roadman: Power–speed tool](https://roadmancycling.com/tools/power-speed)
