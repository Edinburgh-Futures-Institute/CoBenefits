import { base } from '$app/paths'
import { json, csv } from 'd3';

import * as topojson from "topojson-client";

// import {areaIDtoData, dataPage, UKZones, zones} from '../data.page.ts';

// import {rewind} from "@turf/turf";
// import {joinArrays} from "$lib/utils.ts";
import {getNbOfLAD, initDB} from "$lib/duckdb";

// import data for landing page
import {
    getTableData,
    getAggregationPerBenefit,
    getTopSeletedLADsByTotal,
    previewTableData,
    getTotalPerHouseholdByLAD,
    getTopSelectedLADsPerHousehold,
    getAggregationPerCapitaPerBenefit,
    getDistinctNationValues,
    getTotalAggregation,
    getDistinctLookupValueCount
} from "$lib/duckdb";



// const zonesPath = '/maps/Lower_layer_Super_Output_Areas_2021_EW_BGC_V3_-6823567593069184824.geojson';
// topojson
// const zonesPath = '/maps/Lower_layer_Super_Output_Areas_2021_EW_BGC_V3_-6823567593069184824.json';
// const zonesPath = 'maps/Lower_layer_Super_Output_Areas_2021_EW_BGC_V3_-6823567593069184824.json';

// const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`
// const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`
// const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`


export async function load() {
    // await initDB();
    // const db = await initDB();

    // const zones = await json(zonesPath, (d) => {
    //     return d;
    // })

    // const UKZones = topojson.feature(zones, zones.objects["Lower_layer_Super_Output_Areas_2021_EW_BGC_V3_-6823567593069184824"]);

    // let LADToName = {};
    // await csv(LADEngPath).then(data => {
    //     for (let lad of data) {
    //         LADToName[lad.LAD22CD] = lad.LAD22NM;
    //     }
    // })
    // await csv(LADNIPath).then(data => {
    //     for (let lad of data) {
    //         LADToName[lad.LGD2014_code] = lad.LGD2014_name;
    //     }
    // })
    // await csv(LADScotlandPath).then(data => {
    //     for (let lad of data) {
    //         LADToName[lad.LA_Code] = lad.LA_Name;
    //     }
    // })

    // for preview datatable
    // const previewData = await getTableData(previewTableData());
    // console.log("Column names:", Object.keys(previewData[0]));
    // console.log("First 10 rows of cobenefits:", previewData);
    // const distinctNations = await getTableData(getDistinctNationValues());
    // console.log("distinctNations", distinctNations);

    // const distinctLookupValueCount = await getTableData(getDistinctLookupValueCount());
    // console.log("distinctLookupValueCount", distinctLookupValueCount);


    // for landing page waffle and COBEN columns
    // let aggregationPerBenefit = await getTableData(getAggregationPerBenefit());
    // console.log("aggregationPerBenefit", aggregationPerBenefit);
    // for landing page LAD columns


    // let aggregationPerCapitaPerBenefit = await getTableData(getAggregationPerCapitaPerBenefit());
    // let totalAggregation = await getTableData(getTotalAggregation());

    // console.log("NB OF LAD: ", await getTableData(getNbOfLAD()))

    return {
        // datazones: UKZones,
        // LADToName,
        // aggregationPerBenefit,
        // aggregationPerCapitaPerBenefit,
        // totalAggregation
    }
}

export const ssr = false;
export const prerender = true;