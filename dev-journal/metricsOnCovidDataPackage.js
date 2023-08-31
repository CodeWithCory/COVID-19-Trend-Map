
const covidData = require('../src/assets/covid-data-2022-03-16.json');

let countOfAreas = 0;

countOfAreas += 1; // National
countOfAreas += covidData.state.geoJson.features.length;
countOfAreas += covidData.county.geoJson.features.length;

let countOfTimeStops = covidData.weekDefinitions.list.length;

let countOfStatusReports = countOfAreas * countOfTimeStops;

console.log('Number of Status Reports:', countOfStatusReports);



/* Notes */

// Object.keys(covidData);
// // [ 'county', 'state', 'national', 'weekDefinitions', 'source' ]

// Object.keys(covidData.national);
// // [ 'geoJson', 'caseLookup', 'deathsLookup' ]

// Object.keys(covidData.national.caseLookup);
// // [ '0' ]

// Object.keys(covidData.national.caseLookup[0]);
// // [ 'name', 'data' ]

// Object.keys(covidData.national.caseLookup[0].name);
// // [
// //     '0', '1', '2', '3', '4',
// //     '5', '6', '7', '8', '9',
// //     '10', '11', '12', '13', '14',
// //     '15', '16', '17', '18', '19',
// //     '20', '21', '22', '23'
// // ]

// Object.keys(covidData.national.caseLookup[0].data);
// // [ '0',  '1',  '2', ... '160' ]

// Object.values(covidData.national.caseLookup[0].data[0]);
// // [ 14, 2, -3, 0, 0, 0 ]

// Object.values(covidData.national.caseLookup[0].data[1]);
// // [ 16, 2, -4, 0, 0, 0 ]

// Object.values(covidData.national.caseLookup[0].data[2]);
// // [ 19, 3, 1, 0, 0, 0 ]
