import * as d3 from "d3"
import {base} from '$app/paths';


import airQualityIcon from '$lib/icons/AirQuality.png';
import congestionIcon from '$lib/icons/Congestion.png';
import dampnessIcon from '$lib/icons/Dampness.png';
import dietChangeIcon from '$lib/icons/DietChange.png';
import excessColdIcon from '$lib/icons/ExcessCold.png';
import excessHeatIcon from '$lib/icons/ExcessHeat.png';
import hassleCostIcon from '$lib/icons/HassleCosts.png';
import noiseIcon from '$lib/icons/Noise.png';
import roadRepairsIcon from '$lib/icons/RoadRepairs.png';
import roadSafetyIcon from '$lib/icons/RoadSafety.png';
import physicalActivityIcon from '$lib/icons/PhysicalActivity.png';

import coBenefits from '$lib/definitions/cobenf.json'
import seFactors from '$lib/definitions/se-factor.json'


export let CBS = coBenefits.map(f => f.id);
export const COBENEFS = coBenefits.map(d => ({ id: d.id, label: d.label }));
export let CO_BEN = coBenefits.map(d => ({ id: d.id, label: d.label, def: d.def  }));
export const DEFINITIONS = coBenefits.map(d => ({ id: d.id, def: d.def }));


export const SCENARIOS = ["BNZ", "Engagement", "Tailwinds", "Headwinds", "Innovation"]

export let SE_FACTORS = seFactors.map(f => ({ id: f.id, label: f.label, def: f.def })); 

export let SEF = seFactors.map(f => f.id);

export const SEF_ID = seFactors.map(f => f.id);
export const SEF_LABEL = seFactors.map(d => ({ id: d.id, label: d.label }));
export const SEF_DEF = seFactors.map(d => ({ id: d.id, def: d.def }));
export const SEF_DESCR = seFactors.map(d => ({ id: d.id, description: d.description }));
export const SEF_SHORT_UNITS = seFactors.map(d => ({ id: d.id, short_units: d.short_units }));
export const SEF_UNITS2 = seFactors.map(d => ({ id: d.id, units: d.units }));

export let SEF_UNITS = seFactors.map(f => f.units ?? '?');
export let SEF_CATEGORICAL = seFactors
                                .filter(f => f.type === 'categorical')
                                .map(f => f.id);
console.log("import seFactors", SEF, SEF_UNITS, SEF_CATEGORICAL)

export const SEF_SCALE = d3.scaleOrdinal(SEF, SEF_UNITS);

export const SEF_LEVEL_LABELS = {
    EPC: {
      1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G"
    },
    Tenure: {
      1: "Owner", 2: "Rented (social)", 3: "Rented (private)"
    },
    Typology: {
      1: "Semi-detached", 2: "Detached", 3: "Mid-terrace", 
      4: "End-terrace", 5: "Enclosed end-terrace", 6: "Enclosed mid-terrace"
    },
    Fuel_Type: {
      1: "Gas boiler", 2: "Electric heating", 3: "Oil heating"
    },
    Gas_flag: {
      1: "Yes", 0: "No"
    },
    Number_cars: {
        0: 0, 1: 1, 2: 2
    }
  };


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
export const VIS_COLOR = "#333";
// export const AVERAGE_COLOR = "lightblue";
// export const AVERAGE_COLOR = "#636363";
export const AVERAGE_COLOR = "#9c9c9c";
export const NATION_TO_COLOR = {
    UK: "lightblue",
    NI: "#DA6E1C",
    Scotland: "#0065BD",
    "Eng/Wales": "#C8102E"
}


export const MARGINS = {
    marginLeft: 60,
    marginRight: 60,
    marginBottom: 60,
    marginTop: 60
}


export const AVERAGE_DX = 20;

export const COBENEFS_RANGE = ['#71C35D', '#E11484', '#00AED9', '#EF402B', '#007DBC', '#8F1838', '#C31F33', '#CF8D2A', '#F36D25', '#48773E', '#D3A029'];
// export const COBENEFS_SCALE =  d3.scaleOrdinal(COBENEFS, COBENEFS_RANGE);
export const COBENEFS_SCALE = d3.scaleOrdinal(COBENEFS.map(d => d.id), COBENEFS_RANGE);
export const COBENEFS_RANGE2 = [['#71C35D', '#244a1b', '#499437', '#7cc76a', '#bde3b4'],
    ['#E11484', '#5d0836', '#bb106d', '#ee43a0', '#f6a1cf'],
    ['#00AED9', '#005166', '#00a3cc', '#33d6ff', '#99eaff'],
    ['#EF402B', '#5e1007', '#bd210e', '#f05441', '#f7a9a0'],
    ['#183668', '#132b52', '#2656a5', '#5989d8', '#acc4eb'],
    ['#8F1838', '#570e22', '#ae1d44', '#e15077', '#f0a7bb'],
    ['#C31F33', '#580d17', '#b01b2e', '#e34e61', '#f1a6b0'],
    ['#F99D26', '#633902', '#c67205', '#f9a538', '#fcd29b'],
    ['#F36D25', '#602505', '#c14a0a', '#f47d3d', '#f9be9e'],
    ['#48773E', '#284322', '#518645', '#84b978', '#c1dcbb'],
    ['#D3A029', '#554010', '#aa8121', '#ddb454', '#eed9a9']];
export const COBENEFS_SCALE2 = d3.scaleOrdinal(COBENEFS.map(d => d.id), COBENEFS_RANGE2);

export const COBENEFS_RANGE3 = [['#719634','#9FC035','#84DB82','#3FD24C'],
    ['#AF2164', '#E84086', '#FF057C', '#DC0FB3'],
    ['#2CB8B2', '#00B3D0', '#00CAFF', '#0084CC'],
    ['#FF6E3F', '#C3603C', '#BE2742', '#FE1B21'],
    ['#11364F', '#2F255B', '#002172', '#2656A5'],
    ['#B72511', '#9E0B3A', '#780652', '#793542'],
    ['#E34E61', '#B71F64', '#9D002B', '#C3472A'],
    ['#FFC307', '#FFAF40', '#FF8C39', '#F86D36'],
    ['#FF9754', '#FF802B', '#FF554B', '#FF4000'],
    ['#5F6742', '#769029', '#5E934F', '#357D12'],
    ['#F77C1C', '#F7A240', '#E5BD1B', '#B48F00']];
export const COBENEFS_SCALE3 = d3.scaleOrdinal(COBENEFS.map(d => d.id), COBENEFS_RANGE3);


// export const HEROSLIDES = [
//     {
//       image: `${base}/hero/hero0.png`,
//       source: 'total co-benefits',
//       type: null,
//       label: 'total co-benefits'
//     },
//     ...COBENEFS.map((label, i) => ({
//       image: `${base}/hero/hero${i + 1}.png`,
//       source: `${label.toLowerCase()}.`,
//       type: label,
//       label
//     }))
//   ];

// using waffle chart order

// function getImageIndex(type: string | null): number {
//     if (type === null) return 0; 
//     return COBENEFS.indexOf(type) + 1; 
//   }

function getImageIndex(type: string | null): number {
    if (type === null) return 0;
    const index = COBENEFS.findIndex(d => d.id === type);
    return index >= 0 ? index + 1 : 0;
}


export function getHeroSlides(waffleOrderedTypes: string[]) {
    return [
        {
            image: `${base}/hero/hero0.png`,
            mapImage: `${base}/hero/map0.png`,
            source: 'total co-benefits',
            type: null,
            label: 'total co-benefits'
        },
        ...waffleOrderedTypes.map((id) => {
            const index = getImageIndex(id);
            const match = COBENEFS.find(d => d.id === id);
            return {
                image: `${base}/hero/hero${index}.png`,
                mapImage: `${base}/hero/map${index}.png`,
                source: `${id.toLowerCase()}.`,
                type: id,
                label: match?.label ?? id
            };
        })
    ];
}

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


let spinnerElement: HTMLElement | null = null;
let overlayElement: HTMLElement | null = null;

export function addSpinner(selection: HTMLElement): void {
    // Prevent multiple spinners
    if (spinnerElement || overlayElement) return;

    // Create gray overlay to block interaction
    overlayElement = document.createElement('div');
    overlayElement.style.position = 'absolute';
    overlayElement.style.top = '0';
    overlayElement.style.left = '0';
    overlayElement.style.width = '100%';
    overlayElement.style.height = '100%';
    overlayElement.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    overlayElement.style.pointerEvents = 'auto';
    overlayElement.style.zIndex = '9998';

    // Ensure the selection is relatively positioned
    const computedStyle = window.getComputedStyle(selection);
    if (computedStyle.position === 'static') {
        selection.style.position = 'relative';
    }

    selection.appendChild(overlayElement);

    // Create spinner at the center of the viewport
    spinnerElement = document.createElement('div');
    spinnerElement.style.position = 'fixed';
    spinnerElement.style.top = '50%';
    spinnerElement.style.left = '50%';
    spinnerElement.style.transform = 'translate(-50%, -50%)';
    spinnerElement.style.zIndex = '9999';

    spinnerElement.innerHTML = `
    <div style="
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    "></div>
  `;

    // Add spin keyframes if not already present
    if (!document.getElementById('spinner-keyframes')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'spinner-keyframes';
        styleSheet.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
        document.head.appendChild(styleSheet);
    }

    document.body.appendChild(spinnerElement);
}

export function removeSpinner(selection: HTMLElement): void {
    if (overlayElement && selection.contains(overlayElement)) {
        selection.removeChild(overlayElement);
        overlayElement = null;
    }
    if (spinnerElement && document.body.contains(spinnerElement)) {
        document.body.removeChild(spinnerElement);
        spinnerElement = null;
    }
}