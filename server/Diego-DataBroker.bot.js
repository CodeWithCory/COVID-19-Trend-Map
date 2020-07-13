/*                                    */
/* Hello, I am Diego the Data Broker. */
/*                                    */

const { Client, Got, Papa, fs, path } = getDependencies();

module.exports = {
  start: () => {
    runStartupTasks();
    initDataCollectionSchedule();
  },
  getLatestDataAndMetrics: async () => {
    // return await retrieveCovidDataPackage();
    return await generateCovidDataPackage_dev();
    // return await generateCovidDataPackage();
  }
}

/**
 * Runs on every new build
 */
async function runStartupTasks() {
  /* Run startup tasks if needed */

  // retrieveCovidDataPackage()

  /* Testing */
  // const covidCountiesData = await generateCovidDataPackage_dev();
  // const covidCountiesData = await generateCovidDataPackage();

}

/**
 * Runs according to a schedule
 */
function initDataCollectionSchedule() {
  // TODO:
  /* `npm i cron` - this is the dependency I'll want to use to establish Diego's agenda */
  /* JHU updates their data around midnight to 1am Et, so I should pull around 2-3am ET to be safe, and not on the hour to help even out server load. Also perhaps pull multiple times per day. 2?*/
}

/* 
  TODO:
  - Fix bug causing the discrepancy between rate and cumulative cases (example: City of Fairfax, VA

*/

async function retrieveCovidDataPackage() {

  try {
    /* First, attempt to retrieve the data from the database */
    return queryPrimaryDatabase(`SELECT data FROM covid_19 WHERE label='test_latest'`, () => {
      if (err) {

      } else {

      }  
    })
  } catch (err) {
    console.log("err", err)
    /* If data cannot be retrieved from the database, manually recalculate directly from the data source */
    // return await generateCovidDataPackage_dev();
    // return await generateCovidDataPackage();

  }


}

async function generateCovidDataPackage() {

  const url_jhuUsConfirmedCasesCsv = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv";
  const csvContent = await Got(url_jhuUsConfirmedCasesCsv).text();

  const filePath_geoJson = path.join(__dirname, './data/us_counties.geojson');
  const geoJsonContent = fs.readFileSync(filePath_geoJson, "utf8");

  return getCovidResults(csvContent, geoJsonContent);

}

async function generateCovidDataPackage_dev() {

  let filePath = path.join(__dirname, '../../EXTERNAL/COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv');
  let data = fs.readFileSync(filePath, "utf8");
  const csvContent = data;

  const filePath_geoJson = path.join(__dirname, './data/us_counties.geojson');
  const geoJsonContent = fs.readFileSync(filePath_geoJson, "utf8");
  const dev = true;

  return getCovidResults(csvContent, geoJsonContent, dev);

}

function getCovidResults(csvContent, geoJsonContent, dev = false) {

  /* Parse inputs into usable data structures */
  const usDailyConfirmedArray2d = Papa.parse(csvContent).data;
  const countiesGeoJson = JSON.parse(geoJsonContent); // "Object.keys(countiesGeoJson)" => [ 'type', 'name', 'crs', 'features' ]

  /** Data diagnostics **/

  let dataStartColumnIndex;
  let headers = usDailyConfirmedArray2d[0];
  for (let i_header = 0; i_header < headers.length; i_header++) {
    if ((headers[i_header].length === 7 || headers[i_header].length === 8) && headers[i_header].match(/\//g).length == 2) {
      dataStartColumnIndex = i_header;
      break;
    }
  }

  /** Calculate weekly rate **/

  let covid19DailyCountLookup = {};
  let covid19WeeklyCountLookup = {};
  let covid19WeeklyRateLookup = {};
  let covid19WeeklyAccelerationLookup = {};
  let dataHeaders = headers.slice(dataStartColumnIndex, headers.length);
  let weeklyDataHeaders = [];
  /* Get weekly data headers */
  for (let i_header = dataHeaders.length - 1; i_header >= 0; i_header -= 7) {
    weeklyDataHeaders.push(dataHeaders[i_header]);
  }

  /* For each county */
  for (let i_county = 1; i_county < usDailyConfirmedArray2d.length - 1; i_county++) {
    let currentFips = parseInt(usDailyConfirmedArray2d[i_county][4], 10).toString().padStart(5, '0');
    let currentDailyDataArray = usDailyConfirmedArray2d[i_county].slice(dataStartColumnIndex, usDailyConfirmedArray2d[i_county].length);
    covid19DailyCountLookup[`f${currentFips}`] = currentDailyDataArray;

    let currentWeeklyCountArray = [];
    let currentWeeklyRateArray = [];
    let currentWeeklyAccelerationArray = [];

    /* Calculate county rate for all time-stops */
    let lastCount = undefined;
    for (let i_count = currentDailyDataArray.length - 1; i_count >= 0; i_count -= 7) {
      let currentCount = parseInt(currentDailyDataArray[i_count], 10);
      currentWeeklyCountArray.push(currentCount);
      if (lastCount !== undefined) {
        let currentRate = lastCount - currentCount;
        currentWeeklyRateArray.push(currentRate);
      }
      lastCount = currentDailyDataArray[i_count];
    }

    /* Calculate county acceleration for all time-stops */
    let lastRate = undefined;
    let currentRate;
    for (let i_rate = 0; i_rate < currentWeeklyRateArray.length; i_rate++) {
      currentRate = currentWeeklyRateArray[i_rate];
      if (lastRate !== undefined) {
        let currentAcceleration = lastRate - currentRate;
        currentWeeklyAccelerationArray.push(currentAcceleration);
      }
      lastRate = currentWeeklyRateArray[i_rate];
    }

    currentWeeklyCountArray.reverse();
    currentWeeklyRateArray.reverse();
    currentWeeklyAccelerationArray.reverse();

    /* Good test index (i_county) is 5 */
    if (true /* i_county === 5 */ /* || i_county === 6 */ ) {
      // console.log("DIFFERENTIATION")
      /* Differentiate zero values between "has never had a new case", "back to no new cases",
      and the magnitude of "back to no new cases" */

      /* TODO: Figure out why the strings are coming through as null in the front end */

      let zeroStreak = 0;
      let lastValueWasZero = false;
      let noCasesYet = true;
      for (let i_rate = 0; i_rate < currentWeeklyRateArray.length; i_rate++) {
        if (currentWeeklyRateArray[i_rate] === 0) {
          if (noCasesYet === false) {
            // currentWeeklyRateArray[i_rate] = zeroStreak < 5 ? zeroCaseValueLookup[zeroStreak] : "0_5w+"
            currentWeeklyRateArray[i_rate] = `0w${zeroStreak + 1}`;
            zeroStreak++;
          }
        } else {
          zeroStreak = 0;
          lastValueWasZero = false;
          noCasesYet = false;
        }
      }

      // console.log(currentWeeklyRateArray);
      // console.log(currentWeeklyAccelerationArray);
      // break;
    }

    /* Log results */
    // currentWeeklyCountArray.reverse();
    // currentWeeklyRateArray.reverse();
    covid19WeeklyCountLookup[`f${currentFips}`] = currentWeeklyCountArray;
    covid19WeeklyRateLookup[`f${currentFips}`] = currentWeeklyRateArray;
    covid19WeeklyAccelerationLookup[`f${currentFips}`] = currentWeeklyAccelerationArray;
  }


  /* Enrich county GeoJSON with weekly acceleration data */

  let countyCovidDataLookup = {};

  for (let county of countiesGeoJson.features) {

    weeklyCovidNonNormalizedDataArray = []

    /*
      - Match FIPS to calculate normalized rate and acceleration
      - Create new "week" key (t1 - tN) for each week going back to total-2 (same as acc length)
      - Assign each week array of data values: [normalized rate, normalized acceleration]
      - Add to countyCovidDataLookup where key=FIPS, value=[cumulative, rate, acceleration]
      - delete POPULATION from county 
    */

    const pop = county.properties.POPULATION <= 0 ? 0.0001 : county.properties.POPULATION;
    const fips = county.properties.FIPS;

    try {
      /* Initialize "i" at 2 to skip first 2 weeks where we do not have acceleration data */
      for (let i_wk = 2; i_wk < weeklyDataHeaders.length; i_wk++) {
        let tN = i_wk - 1;
        const count = covid19WeeklyCountLookup[`f${fips}`][i_wk];
        const rate = covid19WeeklyRateLookup[`f${fips}`][i_wk - 1];
        const acceleration = covid19WeeklyAccelerationLookup[`f${fips}`][i_wk - 2]
        const rateNormalized = Math.round(rate / pop * 100000);
        const accelerationNormalized = Math.round(acceleration / pop * 100000);

        county.properties[`t${tN}`] = [rateNormalized, accelerationNormalized];
        weeklyCovidNonNormalizedDataArray.push([count, rate, acceleration])
      }
    } catch {
      console.log("County Data Processing Error at ", fips, county.properties.NAME);
    }

    countyCovidDataLookup[`f${fips}`] = weeklyCovidNonNormalizedDataArray;
    delete county.properties.POPULATION;
  }

  /* Make date lookup for each "week" (t1 - tN in GeoJSON) */
  let weekDefinitionsList = [];
  let weekDefinitionsLookup = {};
  weeklyDataHeaders.reverse();
  for (let i_wk = 2; i_wk < weeklyDataHeaders.length; i_wk++) {
    weekDefinitionsList.push(weeklyDataHeaders[i_wk]);
    weekDefinitionsLookup[`t${i_wk-1}`] = weeklyDataHeaders[i_wk];
  }

  let dataPackage = {
    "geojson": countiesGeoJson,
    "datalookup": countyCovidDataLookup,
    "weekdefinitions": {
      "list": weekDefinitionsList,
      "lookup": weekDefinitionsLookup,
    },
    "dev": dev,
  }

  // queryPrimaryDatabase(`
  //   INSERT INTO covid_19 (
  //     label,
  //     data
  //   ) VALUES (
  //     'test_latest',
  //     $1
  //   );
  // `, [dataPackage], (err, res) => {
  //   if (err) {
  //     console.log("[Diego]: Error adding data to database:\n", err);
  //     /* TODO: Add "data upload failure" entry to Diego's Journal, get rid of "err" in console.log*/
  //   } else {
  //     console.log("[Diego]: Success adding COVID-19 data to database.");
  //   }
  // });

  return dataPackage
}


/**
 * Asynchronous function which queries the database and returns the response
 * @param {string} queryString - SQL Query String
 * @param {function} callBackFunction - requires parameters (err, res), fires when query finishes
 */
async function queryPrimaryDatabase(queryString, dataArr, callBackFunction = (err, res) => {}) {
  console.log("process.env.DATABASE_URL", process.env.DATABASE_URL);
  const pgPsqlClient = new Client({
    connectionString: process.env.DATABASE_URL,
    // ssl: true,
    ssl: { rejectUnauthorized: false }
  });
  await pgPsqlClient.connect();
  return pgPsqlClient.query(queryString, dataArr, async (err, res) => {
    try {
      callBackFunction(err, res);
    } catch (err) {
      console.log("Error in callback function: \n", err);
    }
    pgPsqlClient.end();
  });
}

/**
 * Add an entry to Diego's journal by utilizing an INSERT queryPrimaryDatabase on table diegos_journal
 * @param {string} entry_name - Title of entry (max 255 characters)
 * @param {boolean} success - Whether the task succeeded or failed; options are true, false, and null of not relevant
 * @param {string} note - Details of entry
 */
function addEntryToDiegosJournal(entry_name, success, note) {
  queryPrimaryDatabase(`
  INSERT INTO diegos_journal ( entry_name, success, note )
  VALUES ( '${entry_name}', ${String(success)}, '${note}' );
  `);
}

/**
 * Gets all dependencies used by Diego
 */
function getDependencies() {
  const {
    Client
  } = require('pg');
  const Got = require('got');
  const Papa = require('papaparse');
  const fs = require("fs");
  const path = require('path');

  return { Client, Got, Papa, fs, path, };
}
