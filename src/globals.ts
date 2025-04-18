import * as d3 from "d3"

import airQualityIcon from '$lib/icons/AirQuality.jpg';
import congestionIcon from '$lib/icons/Congestion.jpg';
import dampnessIcon from '$lib/icons/Dampness.jpg';
import dietChangeIcon from '$lib/icons/DietChange.jpg';
import excessColdIcon from '$lib/icons/ExcessCold.jpg';
import excessHeatIcon from '$lib/icons/ExcessHeat.jpg';
import hassleCostIcon from '$lib/icons/HassleCosts.jpg';
import noiseIcon from '$lib/icons/Noise.jpg';
import roadRepairsIcon from '$lib/icons/RoadRepairs.jpg';
import roadSafetyIcon from '$lib/icons/RoadSafety.jpg';
import physicalActivityIcon from '$lib/icons/PhysicalActivity.jpg';

export const COBENEFS = ["Air quality", "Noise", "Excess cold", "Excess heat", "Dampness", "Congestion", "Hassle costs", "Road repairs", "Road safety", "Physical activity", "Diet change"]
// export const SCENARIOS = ["BNZ", "test"]
export const SCENARIOS = ["BNZ", "Engagement", "Tailwinds", "Headwinds", "Innovation"]


// export const SCENARIOS = ["BNZ", "test", "all"]
export let SEF = ['Under_35',
       'Over_65', 'EPC', 'Median_Income', 'Tenure', 'Typology', 'Unemployment',
       'Rurality', 'House_value', 'Fuel_Type', 'Fuel_consumption_total',
       'Floor_area', 'Gas_flag', 'Number_cars', 'Urban_trips', 'Total_vkm',
       'Urban_vkm']

export const SEF_CATEGORICAL = ["EPC", "Tenure", "Typology", "Rurality", "Fuel_Type", "Gas_flag", "Number_cars"]

SEF.sort((a,b) => (SEF_CATEGORICAL.includes(b)) - (SEF_CATEGORICAL.includes(a)))

// The years labels have an Y for start otherwise it causes sql issues
// export const TIMES = ["2025_2029", "2030_2034", "2035_2039", "2040_2044", "2045_2040"]
export const TIMES = ["Y2025_2029", "Y2030_2034", "Y2035_2039", "Y2040_2044", "Y2045_2049"]

// All times
// export let TIMES = Array(26).fill(2025).map((x, y) => x + y)
// TIMES = TIMES.map(t => `${t}`)


export type CoBenefit = typeof COBENEFS[number]
export type Scenario = typeof SCENARIOS[number]
export type SEFactor = typeof COBENEFS[number]


// DESIGN PARAMS
export const VIS_COLOR = "black";
export const AVERAGE_COLOR = "lightblue";
export const MARGINS = {
        marginLeft: 60,
        marginRight: 60,
        marginBottom: 60,
        marginTop: 60
    }

export const AVERAGE_DX = 20;

export const COBENEFS_RANGE = ['#5DBB46', '#E11484', '#00AED9', '#F36D25', '#007DBC', '#8F1838', '#C31F33', '#CF8D2A', '#FDB713', '#48773E', '#183668'];
export const COBENEFS_SCALE =  d3.scaleOrdinal(COBENEFS, COBENEFS_RANGE);



export function getIconFromCobenef(cobenefit: CoBenefit) {
    if (cobenefit == "Air quality") {
        return airQualityIcon;
    } else if (cobenefit == "Noise") {
        return noiseIcon;
    } else if (cobenefit == "Excess cold") {
        return excessColdIcon;
    } else if (cobenefit == "Excess heat") {
        return excessHeatIcon;
    } else if (cobenefit == "Dampness") {
        return dampnessIcon;
    } else if (cobenefit == "Congestion") {
        return congestionIcon;
    } else if (cobenefit == "Hassle costs") {
        return hassleCostIcon;
    } else if (cobenefit == "Road repairs") {
        return roadRepairsIcon;
    } else if (cobenefit == "Road safety") {
        return roadSafetyIcon;
    } else if (cobenefit == "Physical activity") {
        return physicalActivityIcon;
    } else if (cobenefit == "Diet change") {
        return dietChangeIcon;
    }
}