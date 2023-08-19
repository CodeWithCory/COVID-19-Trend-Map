
# Development Notes: COVID-19 Trend Map

## Setup

1. `npm i` install dependencies
2. `npm install -g heroku` install the Heroku CLI
   1. `heroku login`
   2. `heroku git:remote -a covid-19-watch` Sets git remote `heroku` and allows other heroku commands to know which heroku app to work with
   3. `heroku config:get DATABASE_URL -s >> .env` Update the gitignored `.env` file with the necessary config vars/keys

## Continuous Development

Follow these steps to get the app up-and-running after a fresh clone

1. `npm ci` Installs dependencies exactly according to the `package-lock.json`
2. `ng build --watch` creates an app build in the `dist/` folder
   - After source code changes simply refresh the page to see updates (thanks to the `--watch` flag)
3. `heroku local` serves Angular's build folder (`dist/`) locally with Heroku connections (config vars, database, etc)
   - Useful for full-stack testing
   - The current app build is available on localhost port 5000 by default: http://localhost:5000

Other commands:

- `ng serve` is also useful to start the front-end in a local server
  - Useful for front-end testing, but it will be cut off from the server
  - Port 4200 is default: http://localhost:4200, but can be changed like `ng s --port 4201`
- `npm start` can be used as an alternative to `heroku local`, but heroku-specific tools will not be accessible

## Analysis Documentation

County map layer with size reduction (7.8 MB > 2.2 MB) process:

  1. Pull Esri's "USA Counties (Generalized)" from the Living Atlas
  2. Fix the layer's geometry by importing & exporting from GRASS via QGIS, then running QGIS's "Fix geometries" tool
  3. Dissolve based on FIPS to turn the resulting Polygon layer back into a MultiPolygon
  4. Export as GeoJSON with only Name, FIPS, and POPULATION; set coordinate precision to 2

## Sources & References

- [COVID-19 Data](https://github.com/CSSEGISandData/COVID-19): Johns Hopkins University Center for Systems Science and Engineering (JHU CSSE)
  - *COVID-19 rate & acceleration are calculated from this data
- [Image of COVID-19](https://phil.cdc.gov/Details.aspx?pid=23312): U.S. Centers for Disease Control (CDC)
- [USA Counties Map Layer & Population](https://www.arcgis.com/home/item.html?id=7566e0221e5646f99ea249a197116605): Esri
- [Florida Dashboard](https://floridacovidaction.com)

## Timeline / TO DO

### 2023 Archival

- [ ] Give the title of the app an HREF to the original URL
- [x] Update the "Share or Bookmark" feature to include the date as well
- [x] 2023-08-13 Next steps: Update app to always use the "historical" verbiage on the "latest" time-stop. Update the About page language to reflect the updates, i.e. that it used to update daily but doesn't anymore, current version is archival, etc.
- [x] 2023-08-08 Generate smaller COVID data package for archival version of app.
- 2023-04-15 A 2023 data package has been downloaded to `covid-data-2023-04-09.json`, need to host a static archival build somewhere like GitHub Pages. Will need to add some kind of "archived" banner and maybe change some wording. I may also want to back up the data a bit since I probably don't need all the way up through 2023.

### Maintenance

To Do:

- [x] [follow-through] Add an About page with details on the data and "how-to" sections for directions (currently in progress) / Robust in-app documentation (about, links, data source, disclaimers, resources, etc)
- [x] [functional] Implement nearest-neighbor match-finding for search results so that coastal searches work better
- [ ] [debugging/functional] Utah is not displaying correctly due to their reporting at the "Local Health Departments" enumeration unit instead of by county: https://github.com/CSSEGISandData/COVID-19/issues/2570 and county-mapping: https://utah.maps.arcgis.com/home/item.html?id=110d43fbfacc411b8e74f4d12b63d881 **(Progress: Counties aggregated in GeoJSON. TODO: Update Diego's workflow to aggregate each health district's numbers with its respective counties; I can use the pictures I took for the FIPS mapping.)**
- [ ] [functional] Add easier way to see the USA status report
- [ ] [efficiency/sharing] Implement server-side rendering (SSR) using Angular Universal to improve mobile load time and improve search engine optimization (SEO)
- [ ] [sharing] Implement different meta tags for share links (title, description, og:image, etc)
- [ ] [functional] Add option to display deaths in the map
- [ ] [functional] Add support for Puerto Rico
- [ ] [efficiency] Add lazy loading for historical COVID-19 data and UI to support
- [ ] [functional] Add zoom-to-extent button
- [ ] [design] Improve mobile design (scroll over map instead of slide-in)
- [ ] [debugging] Ensure cross-browser compatibility & stress testing
- [ ] [functional] Provide the option to automatically acquire the user's location using their device's location service
- [ ] [functional] Make the app more accessible so people with disabilities can use it well too
- [ ] [functional] Make temporal animation more efficient
- [ ] [functional] Explore options for further improving performance and load times


### Class Timeline

- **Week 1** (6/15 - 6/21)
  - [x] Initialize GitHub Repository
  - [x] Architect source code for the server and application
  - [x] Initialize Heroku Project and GitHub deployment integration
  - [x] [Deliverable] Plan, record, post, and deliver elevator pitch

- **Week 2** (6/22 - 6/28)
  - [x] Write server code to pull, aggregate, and geo-enable COVID-19 data from Johns Hopkins for use in the front-end
  - [x] Brainstorm & create wireframe mock-ups using responsive design best-practices to account for varying screen sizes
  - [x] [Deliverable] Write and deliver Status Report #1

- **Week 3** (6/29 - 7/5)
  - [x] Write front-end code to display COVID-19 data [<-Done] using a time-slider and animation controls
    - [x] Display COVID-19 data
    - [x] Historical data with time-slider
    - [x] Animation controls for historical data
  - [x] Create non-functioning UI for location search, share sheet / URL scheme, and maybe chart graphics
  - [x] Publish live Beta #1
  - [x] [Deliverable] Write and deliver user-testing guide utilizing Live Beta #1

- **Week 4** (7/6 - 7/12)
  - [x] Solicit feedback on the live Beta #1 from mentors and peers
  - [x] Build functionality for location search [<-Done], share sheet / URL scheme, and chart graphics
    - [x] Be able to search for locations
    - [x] Build URL scheme & add share sheet
    - [x] Add chart graphics
  - [x] Update application to address feedback from Beta #1
    - [x] Review all feedback received, pick feedback to address, create actionable tasks, triage
    - [x] (triaged feedback)
  - [x] [Deliverable] Write and deliver Status Report #2

- **Week 5** (7/13 - 7/19)
  - [x] Architect database to store COVID-19 data
  - [x] Automate data calls to update the database daily
  - [x] Re-route data pulls to come from the database
  - [x] Conduct bug review

- **Week 6** (7/20 - 7/26)
  - [x] Conduct UX, UI, & responsive design review
  - [x] Conduct cross-browser compatibility review
  - [x] Add "about", tutorial, data source, and disclaimer information
  - [x] Publish Beta #2
  - [x] Solicit feedback for Beta #2 from mentors, peers, and additional testers
  - [x] [Deliverable] Write and deliver Status Report #3

- **Week 7** (7/27 - 8/2)
  - [x] Update application to address feedback from Beta #2
  - [x] Conduct final UX, UI, & responsive design review
  - [x] Conduct final bug review
  - [x] Conduct final cross-browser compatibility review

- **Week 8** (8/3 - 8/9)
  - [x] Launch final application with custom URL and paid Heroku tier for performance
  - [x] [Deliverable] Plan, record, post, and deliver final video demo & application URL
  - [x] [Deliverable] Write and deliver Status Report #4

- **Week 9** (8/10 - 8/16)
  - [x] [Deliverable] Write & deliver executive report
  - [x] Socialize & advertize the application publicly

- **Additional Tasks (scope creep) Week 8**
  - [x] Teach Diego to differentiate "zero" (`0`) values between "has never had a new case", "back to no new cases", and the magnitude of "back to no new cases" (e.g. "no new cases in x weeks")
  - [x] Add death and recovery statistics
  - [x] Add state-level aggregations and borders
  - [x] Add national aggregation

- **Additional tasks pre-final-demo 2020-08-06 - 2020-08-09**
  - [x] [functional] State & National data integrated
  - [x] [functional] Time-enable status reports
  - [x] [design] Improve UI (organize UI, add a "find a status report" type section)
  - [x] [follow-through] Get mentor/peer feedback
  - [x] [design/debugging] Ensure mobile-friendliness
  - [x] [functional] Death & Recovery integration
  - [x] [functional] Validate all aggregations (do manual math against origin CSVs, document process and findings)
