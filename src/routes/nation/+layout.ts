import {
    getAllLAD,
    getAverageCBGroupedByLAD,
    getSefForOneCoBenefit,
    getTotalCBForOneLAD,
    getSUMCBGroupedByLAD,
    getTableData,
    getTotalCBAllDatazones,
    getTotalForOneZone,
    getTotalPerOneCoBenefit,
    getTotalPerPathway,
    getAllCBForOneLAD,
    getAllCBAllDatazones,
    getSUMCBGroupedByLADAndCB,
    getInfo
} from "$lib/duckdb";
import {COBENEFS, type Nation} from "../../globals";

// Called the page report
export async function load({ url }) {
    let nation  = url.searchParams.get('nation');
    nation = capitalizeFirstLetter(nation);
    nation = nation == "Ni" ? "NI" : nation as Nation;

    return {
        nation,
    };
}


function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}