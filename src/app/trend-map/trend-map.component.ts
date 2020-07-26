import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, animate, transition, } from '@angular/animations';

import * as L from 'leaflet';
import * as GeoSearch from 'leaflet-geosearch';
import * as leafletPip from '@mapbox/leaflet-pip'

/* TODO: Contribute to @types/leaflet to fix these types */
export interface CustomTileLayerOptions extends L.TileLayerOptions {
  ext?: string;
}
export interface CustomGeoJSONOptions extends L.GeoJSONOptions {
  smoothFactor?: number;
}

@Component({
  selector: 'app-trend-map',
  templateUrl: './trend-map.component.html',
  styleUrls: ['./trend-map.component.scss'],
  animations: [
    trigger('panelOpenClosed', getPanelTransitions()),
    trigger('mapMinMax', getMapTransitions())
  ]
})
export class TrendMapComponent implements OnInit {

  /* Map Data Control */
  map: any;
  countyGeoJSON: any; /* GeoJSON Object format,  */
  lastSelectedLayer: any;
  choroplethDisplayAttribute: number = 3;// 3(rateNormalized), 4(accelerationNormalized), 5(streak)

  /* Component Coordination */
  countyDataLookup: { [FIPS_00000: string]: {name: string, data: number[][]} };
  geoJsonCountyLookup: {[FIPS_00000: string]: any}; /* Contains references to each county in the GeoJSON layer */

  /* Temporal Coordination */
  latestTimeStop: { name: string, num: number }; /* Latest data available */
  currentTimeStop: { name: string, num: number };

  /* UI Text Content Control */
  panelContent: any = {};// panelContent: { title?: string, subtitle?: string, rate?: number, acceleration?: number, cumulative?: number, accWordMoreLess?: string, accWordAccelDecel?: string, accWordAndBut?: string, } = { };
  weekDefinitions: { list: string[], lookup: { [timeStop_tN: string]: string } };
  stateFipsLookup: { [StateFips_00: string]: { name: string, abbr: string } } = this.getStateFipsLookup();

  /* State Control */
  infoPanelOpen: boolean = false;


  constructor(private http: HttpClient, private titleService: Title, private metaService: Meta) { }

  ngOnInit(): void {
    this.titleService.setTitle("COVID-19 Trend Map");
    this.metaService.addTags([
      { name: 'keywords', content: 'COVID-19, Coronavirus, Trend, JHU, Johns Hopkins' },
      { name: 'description', content: 'See COVID-19 trends where you live.' },
      // {name: 'robots', content: 'index, follow'},
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=0' }
    ]);
    this.map = this.initializeMap();
    this.getData();


    /* TODO: Animation
      - Use setInterval
      - Possible time-range options: Previous month, 3 months, all data
      - Idea for smooth animations: Do it The Prestige style with 2 layers fading back and forth

    */

    /* Working animation proof of concept: */
    /* 
    let timeAnimation;
    setTimeout(() => {
      let initialTimeStop = this.currentTimeStop.num;
      let workingTimeStop = initialTimeStop;
      timeAnimation = setInterval(() => {
        // console.log("Changing this.currentTimeStop to ", { name: `t${workingTimeStop}`, num: workingTimeStop })
        console.log(this.weekDefinitions.list[workingTimeStop])
        this.currentTimeStop = { name: `t${workingTimeStop}`, num: workingTimeStop };
        if (workingTimeStop < this.weekDefinitions.list.length -1 ) {
          workingTimeStop++;
          this.updateMapDisplay();
        } else {
          workingTimeStop = 0;
          this.updateMapDisplay();
        }
      }, 1000)
    }, 3000);
    */

    // setTimeout(() => {
    //   clearInterval(timeAnimation);
    // }, 16000);


    /* TODO: Use Leaflet's map.locate() to get the user's location and give it a URL scheme command */

    /* TODO: Add JHU's attribution, something like "All COVID-19 information is calculated from the COVID-19 Data Repository by the Center for Systems Science and Engineering (CSSE) at Johns Hopkins University" */

  }

  getData() {
    const url = '/api/getData';
    const body = {};
    this.http.post(url, body).subscribe((response: any) => {
      this.weekDefinitions = response.weekdefinitions;
      this.countyDataLookup = response.datalookup;
      this.latestTimeStop = {
        name: Object.keys(this.weekDefinitions.lookup).slice(-1)[0],
        num: this.weekDefinitions.list.length - 1
      }
      this.currentTimeStop = {
        name: this.latestTimeStop.name,
        num: this.latestTimeStop.num
      }

      /* Useful for debugging */
      console.log("Data Source:", response.source);
      // console.log("Data Package:", response);
      // Good FIPS test-cases to console.log: 31041, 08009

      this.initMapData(response.geojson);

    });

  }

  getDataTest() {
    const url = '/api/getDataFromDatabaseTest';
    const body = {};
    this.http.post(url, body).subscribe((response: any) => {

      console.log("from database: ", response);

      // console.log("!! this.latestTimeStop", this.latestTimeStop);
      // console.log("!! this.currentTimeStop", this.currentTimeStop);
      // console.log("!! this.weekDefinitions", this.weekDefinitions);
      // console.log("this.weekDefinitions.lookup[this.currentTimeStop.name]", this.weekDefinitions.lookup[this.currentTimeStop.name]);
    });

  }

  initializeMap() {
    const map = L.map('map', {
      maxZoom: 14,
      minZoom: 3,
      maxBounds: L.latLngBounds([[80, -230], [-15, 15]]),
      zoomControl: false,
    })

    map.setView([40, -98.5], 4); /* TODO: Maybe use fitBounds with padding to account for panel size */

    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    /* Basemaps */
    // const OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {});
    // const Stamen_TonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', { ext: 'png' });
    // const Stamen_TonerHybrid = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.{ext}', { ext: 'png' });
    const CartoDB_PositronNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {});
    map.addLayer(CartoDB_PositronNoLabels);
    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution('Cartographer: Cory Leigh Rahman');

    let Stamen_TonerHybrid_Options: CustomTileLayerOptions = {
      // attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 20,
      ext: 'png'
    }
    var Stamen_TonerHybrid = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.{ext}', Stamen_TonerHybrid_Options);

    map.on('zoomend', () => {
      const zoomLevel = this.map.getZoom();
      if (zoomLevel >= 6) {
        if (!this.map.hasLayer(Stamen_TonerHybrid)) {
          this.map.addLayer(Stamen_TonerHybrid);
          this.countyGeoJSON.setStyle({ fillOpacity: 0.5 });
        }
      } else {
        if (this.map.hasLayer(Stamen_TonerHybrid)) {
          this.map.removeLayer(Stamen_TonerHybrid)
          this.countyGeoJSON.setStyle({ fillOpacity: 0.9 });
        }
      }
    });

    /* This is the default Leaflet Control and is somewhat customizable */

    const geoSearch = new GeoSearch.GeoSearchControl({
      provider: new GeoSearch.OpenStreetMapProvider(),
      style: "bar",
      showMarker: false,
      showPopup: false,
      autoClose: true,
      searchLabel: "Search for your County, Town, or City",
      classNames: { container: "geosearch-container", button: "geosearch-button", /* resetButton: "geosearch-resetButton", */ msgbox: "geosearch-msgbox", form: "geosearch-form", input: "geosearch-input" },
      retainZoomLevel: true,
      autoCompleteDelay: 500,
    });
    map.addControl(geoSearch);
    map.on('geosearch/showlocation', (place) => { this.locationSelected(place) });

    map.on('popupopen', function (event) {
      console.log("event", event);
      // self.elementRef.nativeElement.querySelector('.partner-link')
      //   .addEventListener('click', (e) => {
      //     const partnerId = e.target.getAttribute('data-partnerId');
      //     self.showPartner(partnerId);
      //   });
    })

    return map;
  }

  locationSelected(place) {
    const locationInfo = place.location.label.split(", ");
    const topLevelLocation = locationInfo.slice(-1);
    const secondLevelLocation = locationInfo.slice(-2)[0];
    console.log("place", place);
    console.log("locationInfo", locationInfo);
    try {
      this.map.closePopup();
      this.lastSelectedLayer.setStyle({ weight: 0/* , color: "white" */ });
    } catch (e) { }
    if (topLevelLocation == "United States of America") {
      if (locationInfo.length > 2) {
        /* Testing */
        let matchedLayer = leafletPip.pointInLayer([place.location.x, place.location.y], this.countyGeoJSON, true)[0];
        // console.log("matchedLayer", matchedLayer);
        // console.log("matchedLayer.getBounds()", matchedLayer.getBounds());

        /* Update Map */
        this.map.flyToBounds(matchedLayer.getBounds().pad(1)/* , { duration: 1.5 } */);
        this.map.once('zoomend', () => {
          matchedLayer.bringToFront();
          matchedLayer.setStyle({ weight: 6/* , color: "black" */ });
          const popupText = `<strong>${locationInfo[0]}, </strong>${locationInfo.slice(1, -1).join(", ")}`
          this.map.openPopup(popupText, [place.location.y, place.location.x])
          // matchedLayer.openPopup(); // This is for opening the normal click-popup
          setTimeout(() => {
            this.infoPanelOpen = true;
          }, 250)
        });

        /* Update Info Panel */
        // title: "Natchitoches", subtitle: "Louisiana", rate: 20,
        // acceleration: 10, cumulative: 300, accWord: "more",

        const countyInfo = this.countyDataLookup[`${matchedLayer.feature.properties.FIPS}`];
        const countyName = countyInfo.name;
        const countyData = countyInfo.data[this.currentTimeStop.num];
  
        let cumulative: number = countyData[0];
        let rate: number = countyData[1];
        let acceleration: number = countyData[2];

        this.panelContent.title = countyName;
        this.panelContent.subtitle = this.stateFipsLookup[matchedLayer.feature.properties.FIPS.substr(0, 2)].name;
        this.panelContent.rate = this.styleNum(rate);
        this.panelContent.acceleration = acceleration < 0 ? `-${this.styleNum(Math.abs(acceleration))}` : this.styleNum(Math.abs(acceleration));
        this.panelContent.cumulative = this.styleNum(cumulative);
        this.panelContent.date = this.weekDefinitions.lookup[this.currentTimeStop.name];

        // {{panelContent.title}} is reporting new cases of COVID-19 this week {{panelContent.accWordAndBut}} the number of new cases is {{panelContent.accWordAccelDecel}}.

        // let summaryString = `${this.panelContent.title} is reporting`;
        // if (rate > 0) {
        //   summaryString += " new cases of COVID-19 this week";
        //   summaryString += acceleration >= 0 ? " and" : " but";
        //   summaryString += " the number of new cases is";
        //   summaryString += acceleration > 0 ? " accelerating."
        //     : acceleration == 0 ? "steady." : " decelerating."
        // } else {
        //   summaryString += "no new cases of COVID-19 this week.";
        // }

        this.panelContent.summary = `${this.panelContent.title} is reporting <strong>${this.panelContent.rate} new cases</strong> of COVID-19 over the past week ${acceleration >= 0 || rate == 0 ? "and" : "but"} the rate of ${rate > 0 ? "" : "no"} new cases is <strong>${acceleration > 0 ? "accelerating." : acceleration == 0 ? "steady." : "decelerating."}</strong>`;



        // this.panelContent.accWordMoreLess = countyData[2] > 0 ? "more" : "less";
        // this.panelContent.accWordAccelDecel = countyData[2] > 0 ? "accelerating" : "decelerating";
        // this.panelContent.accWordAndBut = countyData[2] > 0 ? "and" : "but";

        this.lastSelectedLayer = matchedLayer;
        /* TODO: Exception for Alaska and places within */
      } else {
        this.map.flyToBounds(place.location.bounds);
      }
    } else if (locationInfo.length == 1 && topLevelLocation == "United States") {
      this.map.flyTo([40, -98.5], 4/* , { duration: 1.5 } */);
    } else {
      const currentView = this.map.getBounds();
      alert("Location not found in the U.S.");
      setTimeout(() => {
        this.map.fitBounds(currentView);
      }, 50)
    }
    setTimeout(() => {
      /* Fix bug where the map needs to be clicked twice to show a popup */
      this.eventFire(document.getElementById('map'), 'click');
    }, 200);
  }

  initMapData(geojson) {

    const countyStyle = {
      // radius: 8,
      fillColor: "transparent",
      color: "black", /* This is the focus color */
      weight: 0, /* Weight gets toggled to focus a particular region */
      opacity: 1,
      fillOpacity: 0.9
    };

    const countyGeoJsonOptions: CustomGeoJSONOptions = {
      smoothFactor: 0.6,
      style: countyStyle,
      onEachFeature: (feature, layer) => {
        layer.bindPopup("");
      }
    }
    this.countyGeoJSON = L.geoJSON(geojson, countyGeoJsonOptions);

    this.map.addLayer(this.countyGeoJSON);
    this.updateMapDisplay(this.choroplethDisplayAttribute);

  }

  updateMapDisplay(attribute = undefined) {

    this.choroplethDisplayAttribute = attribute ? attribute : this.choroplethDisplayAttribute;

    /* Set configurations */
    let getStyle: Function;
    let attributeLabel: string;
    let rawCountId: number;
    let normalizedId: number;
    if (attribute === 3) {
      getStyle = this.getRateStyleFunction;
      attributeLabel = "New This Week";
      rawCountId = 1;
      normalizedId = 3;
    } else if (attribute === 4) {
      getStyle = this.getAccelerationStyleFunction;
      attributeLabel = "Acceleration";
      rawCountId = 2;
      normalizedId = 4;
    } else {
      getStyle = this.getRateStyleFunction;
      attributeLabel = "New This Week";
      rawCountId = 1;
      normalizedId = 3;
    }

    /* Update GeoJSON features */
    this.countyGeoJSON.eachLayer((layer) => {
      // if(layer.feature.properties.NAME == 'feature 1') {    
      //   layer.setStyle({fillColor :'blue'}) 
      // }

      /* Update popup */
      const countyInfo = this.countyDataLookup[`${layer.feature.properties.FIPS}`];
      const countyName = countyInfo.name;
      const countyData = countyInfo.data[this.currentTimeStop.num];
      const stateName = this.stateFipsLookup[layer.feature.properties.FIPS.substr(0, 2)].name
      layer.setPopupContent(`
      <strong>${countyName}</strong>, ${stateName} <span class="popup-fips-label">[${layer.feature.properties.FIPS}]</span>
      <br>${attributeLabel}: <strong>${this.styleNum(countyData[rawCountId])}</strong> (${this.styleNum(countyData[normalizedId])} per 100k)
      `);
      // <br><br><button type="button" class="popup-see-status-report-btn btn btn-secondary btn-sm btn-light">See Status Report</button>

      /* Update color */
      layer.setStyle(getStyle(countyData[normalizedId]));

    });

  }

  closePanel() {
    this.infoPanelOpen = false;
    this.lastSelectedLayer.setStyle({ weight: 0/* , color: "white" */ });
    // setTimeout(() => {
    // this.map.invalidateSize();
    // }, 750)
  }

  /**
   * Converts number to string and adds commas to thousands places
   * @param number int
   */
  styleNum(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  getAccelerationStyleFunction(value) {
    switch (true) {
      case (value > 200): return { fillColor: "#5e0000" };
      case (value > 50): return { fillColor: "#990000" };
      case (value > 25): return { fillColor: "#d4644d" };
      case (value > 0): return { fillColor: "#fef0d9" };
      case (value == 0): return { fillColor: "lightgray" };
      case (value >= -25): return { fillColor: "#cddcea" };
      case (value >= -50): return { fillColor: "#90a1ad" };
      case (value < -50): return { fillColor: "#434d5b" };
      default: return {};
    }
  }
  getRateStyleFunction(value) {
    switch (true) {
      case (value > 400): return { fillColor: "hsl(0, 100%, 17%)" };
      case (value > 200): return { fillColor: "hsl(0, 64%, 34%)" };
      case (value > 100): return { fillColor: "hsl(0, 43%, 52%)" };
      case (value > 50): return { fillColor: "hsl(15, 57%, 75%)" };
      case (value > 0): return { fillColor: "hsl(30, 62%, 93%)" };
      case (value <= 0): return { fillColor: "hsl(0, 0%, 95%)" };
      default: return {};
    }
  }

  getStateFipsLookup() {
    return { "01": { "name": "Alabama", "abbr": "AL" }, "02": { "name": "Alaska", "abbr": "AK" }, "03": { "name": "American Samoa", "abbr": "AS" }, "04": { "name": "Arizona", "abbr": "AZ" }, "05": { "name": "Arkansas", "abbr": "AR" }, "06": { "name": "California", "abbr": "CA" }, "07": { "name": "Canal Zone", "abbr": "CZ" }, "08": { "name": "Colorado", "abbr": "CO" }, "09": { "name": "Connecticut", "abbr": "CT" }, "10": { "name": "Delaware", "abbr": "DE" }, "11": { "name": "District of Columbia", "abbr": "DC" }, "12": { "name": "Florida", "abbr": "FL" }, "13": { "name": "Georgia", "abbr": "GA" }, "14": { "name": "Guam", "abbr": "GU" }, "15": { "name": "Hawaii", "abbr": "HI" }, "16": { "name": "Idaho", "abbr": "ID" }, "17": { "name": "Illinois", "abbr": "IL" }, "18": { "name": "Indiana", "abbr": "IN" }, "19": { "name": "Iowa", "abbr": "IA" }, "20": { "name": "Kansas", "abbr": "KS" }, "21": { "name": "Kentucky", "abbr": "KY" }, "22": { "name": "Louisiana", "abbr": "LA" }, "23": { "name": "Maine", "abbr": "ME" }, "24": { "name": "Maryland", "abbr": "MD" }, "25": { "name": "Massachusetts", "abbr": "MA" }, "26": { "name": "Michigan", "abbr": "MI" }, "27": { "name": "Minnesota", "abbr": "MN" }, "28": { "name": "Mississippi", "abbr": "MS" }, "29": { "name": "Missouri", "abbr": "MO" }, "30": { "name": "Montana", "abbr": "MT" }, "31": { "name": "Nebraska", "abbr": "NE" }, "32": { "name": "Nevada", "abbr": "NV" }, "33": { "name": "New Hampshire", "abbr": "NH" }, "34": { "name": "New Jersey", "abbr": "NJ" }, "35": { "name": "New Mexico", "abbr": "NM" }, "36": { "name": "New York", "abbr": "NY" }, "37": { "name": "North Carolina", "abbr": "NC" }, "38": { "name": "North Dakota", "abbr": "ND" }, "39": { "name": "Ohio", "abbr": "OH" }, "40": { "name": "Oklahoma", "abbr": "OK" }, "41": { "name": "Oregon", "abbr": "OR" }, "42": { "name": "Pennsylvania", "abbr": "PA" }, "43": { "name": "Puerto Rico", "abbr": "PR" }, "44": { "name": "Rhode Island", "abbr": "RI" }, "45": { "name": "South Carolina", "abbr": "SC" }, "46": { "name": "South Dakota", "abbr": "SD" }, "47": { "name": "Tennessee", "abbr": "TN" }, "48": { "name": "Texas", "abbr": "TX" }, "49": { "name": "Utah", "abbr": "UT" }, "50": { "name": "Vermont", "abbr": "VT" }, "51": { "name": "Virginia", "abbr": "VA" }, "52": { "name": "Virgin Islands", "abbr": "VI" }, "53": { "name": "Washington", "abbr": "WA" }, "54": { "name": "West Virginia", "abbr": "WV" }, "55": { "name": "Wisconsin", "abbr": "WI" }, "56": { "name": "Wyoming", "abbr": "WY" }, "72": { "name": "Puerto Rico", "abbr": "PR" } }
  }

  eventFire(el, etype) {
    if (el.fireEvent) {
      el.fireEvent('on' + etype);
    } else {
      var evObj = document.createEvent('Events');
      evObj.initEvent(etype, true, false);
      el.dispatchEvent(evObj);
    }
  }

}

function getPanelTransitions() {
  return [
    state('open', style({
      left: '0',
    })),
    state('closed', style({
      left: '-300px',
    })),
    transition('open => closed', [
      animate('0.25s')
    ]),
    transition('closed => open', [
      animate('0.25s')
    ]),
  ]
}

function getMapTransitions() {
  return [
    state('max', style({
      left: '0',
      width: '100%',
    })),
    state('min', style({
      left: '280px',
      width: 'calc( 100% - 280px )',
    })),
    transition('max => min', [
      animate('0.25s')
    ]),
    transition('min => max', [
      animate('0.25s')
    ]),
  ]
}
