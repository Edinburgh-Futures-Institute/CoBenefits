import { csv, json, max, extent, autoType } from 'd3';
// import {topology} from 'topojson';
import pkg from 'topojson';
const {topology} = pkg;

import { base } from '$app/paths';

import {rewind} from "@turf/turf";
import {joinArrays} from "./utils.ts";



// const dataPath = '/predicted_data_final.csv';
// const dataPath = '/predicted_data_per.csv';
const dataPath = `${base}/predicted_data_per.csv`;

// Taken from https://www.data.gov.uk/dataset/3f6c84f1-9da1-4ee0-82a7-50086a775e22/lower-layer-super-output-areas-december-2021-boundaries-ew-bgc-v3
const zonesPath = `${base}/maps/Lower_layer_Super_Output_Areas_2021_EW_BGC_V3_-6823567593069184824.geojson`;


const globalMeasuresPath = `${base}/UK_Archetypes_global_measures.csv`;
const archetypesInfosPath = `${base}/UK_Archetypes_info.csv`;

const S1Path = `${base}/coBenefits/S1_BNZ.csv`
const S2Path = `${base}/coBenefits/S2_WI.csv`
const S3Path = `${base}/coBenefits/S3_WE.csv`
const S4Path = `${base}/coBenefits/S4_TW.csv`
const S5Path = `${base}/coBenefits/S5_HW.csv`

export const COBENEFS = ["Air quality","Noise","Excess cold","Excess heat","Dampness","Congestion","Hassle costs","Road repairs","Road safety","Physical activity","Diet change"]




// GEO DATA: disabled for now
export const dataPage = await csv(dataPath, (d) => {
    return d;
})

dataPage.sort((a, b) => b.Total - a.Total);

export const areaIDtoData = Object.fromEntries(dataPage.map(d => [d.Datazone, d]))

export const zones = await json(zonesPath, (d) => {
    return d;
})
for (let feature of zones.features) {
    feature.geometry = rewind(feature.geometry, {reverse: true});
}

export const UKZones = topology({"t": zones});




export const globalMeasures = await csv(globalMeasuresPath, (d) => {
    return d;
})

export const archetypesInfo = await csv(archetypesInfosPath, (d) => {
    return d;
})


export let S1Data: Array<any> = await csv(S1Path, (d) => {
    // Use the same zone name than in the global measures array
    d["LSOA.DZ.CD"] = d[""]

    d.scenario = "1";

    return d;
})

export let S2Data: Array<any> = await csv(S2Path, (d) => {
    d["LSOA.DZ.CD"] = d[""]

    d.scenario = "2";

    return d;
})
export let S3Data: Array<any> = await csv(S3Path, (d) => {
    d["LSOA.DZ.CD"] = d[""]
    d.scenario = "3";

    return d;
})
export let S4Data: Array<any> = await csv(S4Path, (d) => {
    d["LSOA.DZ.CD"] = d[""]
    d.scenario = "4";

    return d;
})
export let S5Data: Array<any> = await csv(S5Path, (d) => {
    d["LSOA.DZ.CD"] = d[""]
    d.scenario = "5";
    return d;
})



S1Data = joinArrays(S1Data, globalMeasures, "LSOA.DZ.CD");
S2Data = joinArrays(S2Data, globalMeasures, "LSOA.DZ.CD");
S3Data = joinArrays(S3Data, globalMeasures, "LSOA.DZ.CD");
S4Data = joinArrays(S4Data, globalMeasures, "LSOA.DZ.CD");
S5Data = joinArrays(S5Data, globalMeasures, "LSOA.DZ.CD");

// console.log(2323, S1Data[2]);
// console.log(122, globalMeasures);

export const fullData = S1Data.concat(S2Data).concat(S3Data).concat(S4Data).concat(S5Data);

export let fullDataPerCB: Array<{coBenefit, cost, scenario}> = [];
fullData.forEach(d => {
    COBENEFS.forEach(cobenef => {
        fullDataPerCB.push({"coBenefit": cobenef, cost: d[cobenef], scenario: d.scenario})
    })
})

