
/* 
  Update the snapshots JSON (bash syntax):

    # Open the Database, set it to Output ("\o") and Tuple ("\t"; value only) modes, then get the snapshots
    touch dev-journal/metrics/all_snapshots.json
    heroku pg:psql
    \o dev-journal/metrics/all_snapshots.json
    \t
    SELECT snapshot FROM metrics_snapshots where label = 'all_snapshots';
    \t
    \o
    \q

    # Run this report on all_snapshots.json
    node dev-journal/metrics/report.js 7

*/

const snapshots = require("./all_snapshots.json");
const fips = require("./fips.json");

async function main (args) {
  /* For reporting, remove any snapshot that was not automatically generated */
  deduplicateSnapshots();

  console.log("\nCovid-19-Watch");
  listChangeMetrics(args[2] ? args[2] : 1); // Number of days back to compare

  /* TODO: Output CSV of daily changes */  
  /* TODO: Make a command combination to get "so far today" metrics */  
  /* TODO: Match fips with names */  
  /* TODO: Possibly create change-over-time visualization for metrics */

}

// function listLast

function listChangeMetrics(days = 1) {
  console.log(`\nChange Metrics: ${days} days\n`);
  console.log(`Latest Snapshot:\n`, getSnapShots(1))
  let snapshotsKeys = Object.keys(snapshots);
  if (snapshotsKeys.length > days || days === 0) {
    if (days === 0) {
      /* Take 0 as "all time" */
      days = snapshotsKeys.length - 1;
    }
    snapshotsKeys.reverse();
    let latestSnapshot = snapshots[snapshotsKeys[0]];
    let compareSnapshot = snapshots[snapshotsKeys[days]];

    let latestSnapshotPageKeys = Object.keys(latestSnapshot["pages"]);
    let latestSnapshotStatusReportKeys = Object.keys(latestSnapshot["status_reports"]);

    // console.log("latestSnapshot", latestSnapshot);
    // console.log("compareSnapshot", compareSnapshot);
    // console.log("latestSnapshotPageKeys", latestSnapshotPageKeys);

    /* Log Page metrics */
    console.log("\nPAGES\n");
    console.log("Change\tLabel");
    console.log("-----------------");
    for (label of latestSnapshotPageKeys) {
      const latestValue = parseInt(latestSnapshot["pages"][label], 10);
      const lastValue = compareSnapshot["pages"][label] ? parseInt(compareSnapshot["pages"][label], 10) : 0;
      const change = latestValue - lastValue;
      // console.log("label, latestValue, lastValue", label, latestValue, lastValue);
      // console.log("typeof label, typeof latestValue, typeof lastValue", typeof label, typeof latestValue, typeof lastValue);
      if (change) {
        console.log(`${change}\t${label}`);
      }
    }

    /* Log Status Report metrics */
    const changeList = [];
    for (fipsCode of latestSnapshotStatusReportKeys) {
      const latestValue = parseInt(latestSnapshot["status_reports"][fipsCode], 10);
      const lastValue = compareSnapshot["status_reports"][fipsCode] ? parseInt(compareSnapshot["status_reports"][fipsCode], 10) : 0;
      const change = latestValue - lastValue;
      // console.log("fipsCode, latestValue, lastValue", fipsCode, latestValue, lastValue);
      // console.log("typeof fipsCode, typeof latestValue, typeof lastValue", typeof fipsCode, typeof latestValue, typeof lastValue);
      if (change) {
        let label = fipsCode;
        try {
          if (fipsCode.length === 2) {
            let unit = fips.find(i => i.us_state_fips === fipsCode)
            label = `${unit.region}`;
          } else if (fipsCode.length === 5) {
            let unit = fips.find(i => i.us_county_fips === fipsCode)
            label = `${unit.subregion}, ${unit.region}`;
          }
        } catch (e) {
          console.error(e);
        }
        // console.log(`Status Report "${fipsCode} ${label}" change: ${change}`);

        changeList.push({fipsCode, change, label});

      }
    }
    changeList.sort((a, b) => { return a.change < b.change ? 1 : -1 });

    console.log("\n\nSTATUS REPORTS\n")
    console.log("Change\tFIPS\tLabel");
    console.log("-------------------------");
    for (i of changeList) {
      console.log(`${i.change}\t${i.fipsCode}\t${i.label}`);
    }

  } else {
    return "Not enough data for requested days, pick a different number."
  }

}

function getSnapShots(count = false) {
  if (count) {
    if (count === 1) {
      return "Latest Snapshot: ", Object.keys(snapshots).slice(count * -1)[0];
    } else {
      return "Snapshots: ", Object.keys(snapshots).slice(count * -1);
    }
  } else {
    return "Snapshots: ", Object.keys(snapshots);
  }
}

function deduplicateSnapshots() {
  for(snapshot of Object.keys(snapshots)) {
    if (snapshot.split(":")[1] !== "00") {
      delete snapshots[snapshot];
    }
  }
}

function getDependencies() {
  // const fs = require("fs");
  // const path = require('path');

  return { };
}

main(process.argv);