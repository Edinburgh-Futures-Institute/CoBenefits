<script lang="ts">
    import * as d3 from 'd3';
    import {csv} from "d3";
    import * as Plot from "@observablehq/plot";
	import posthog from 'posthog-js';

    import {onMount, onDestroy} from 'svelte';
    import { base } from '$app/paths';

    import {MapUK} from "$lib/components/mapUK";

    import {
        SEF_LABEL,
        SEF_DEF,
        SEF_SHORT_UNITS,
        SEF_DESCR,
        SEF_CATEGORICAL,
        COBENEFS,
        type CoBenefit,
        CBS,
        CO_BEN,
        SEF_UNITS2,
        COBENEFS_SCALE,
        SEF_ID,
        SEF_LEVEL_LABELS,
        SEF_SCALE,
        getIconFromCobenef, addSpinner, removeSpinner, convertToCSV, downloadCSV
    } from "../../globals";


    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {
        getSEFData,
        getTableData,
        getSEFbyCobenData,
        getSefForOneCoBenefit,
        getAggregationPerCapitaPerBenefit,
        getAverageSEFbyCobenDataGroupedByLAD,
        getAverageSEFGroupedByLAD,
        allCBgetAverageSEFGroupedByLAD
    } from "$lib/duckdb";

    import per_capita from '$lib/icons/per_capita.png';
    import total from '$lib/icons/total.png';

    import negative from '$lib/icons/negative.png';
    import Footer from "$lib/components/Footer.svelte";
    import {downloadStaticPDF} from "../../globals.js";
    const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`;
    const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`;
    const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`;

    let element: HTMLElement;
    let plotDist: HTMLElement;
    let plotDot: HTMLElement;
    let plotBar: HTMLElement;
    let plotJitter: HTMLElement;
    let plotMultDot: HTMLElement;
    let plotSmallMult: Record<string, HTMLElement> = {};
    let plotSmallJitter: Record<string, HTMLElement> = {};
    let plot: HTMLElement;
    let height = 400;
    let fullData;
    let SEFData;
    let PCData;
    let LADfullData;
    //let useLAD = false;
    let LADfullData_alt;
    let LADSEFData;
    let dataLoaded = false;
    let averageValue;
    let modeValue;
    let maxValue;
    let minValue;
    let maxLookupValue;
    let maxIndex;
    let minLookupValue;
    let minIndex;
    let modeNumeric;
    let labelLookup;

    // Data from load function
    export let data;

    const SEF = data.SEF;
    const sefId = SEF_ID.find(d => d.id === SEF)?.id ?? SEF;
    const sefLabel = SEF_LABEL.find(d => d.id === SEF)?.label ?? SEF;
    const sefDef = SEF_DEF.find(d => d.id === SEF)?.def ?? SEF;
    const sefdescr = SEF_DESCR.find(d => d.id === SEF)?.description ?? SEF;
    const sefShortUnits = SEF_SHORT_UNITS.find(d => d.id === SEF)?.short_units ?? SEF;
    const sefUnits = SEF_UNITS2.find(d => d.id === SEF)?.units ?? SEF;

    let map: MapUK;
    let mapDiv: HTMLElement;

    let scrolledPastHeader = false;
    let currentSection = '';
    const sectionIds = ['overview', 'compare'];

    const LADToName: { [code: string]: string } = {};
    const SmallAreaToLAD: Record<string, string> = {};
    let ladLoaded: boolean = false;

async function loadLADNames() {
  try {
    const seenLADs: Set<string> = new Set();

    // England
    const eng = await csv(LADEngPath);
    for (let row of eng) {
      const ladCode = row.LAD22CD?.trim();
      const ladName = row.LAD22NM?.trim();
      const lsoaCode = row.LSOA11CD?.trim(); // small area

      if (lsoaCode && ladCode) {
        SmallAreaToLAD[lsoaCode] = ladCode;
      }

      if (!seenLADs.has(ladCode) && ladCode && ladName) {
        LADToName[ladCode] = ladName;
        seenLADs.add(ladCode);
      }
    }

    // Northern Ireland
    const ni = await csv(LADNIPath);
    for (let row of ni) {
      const ladCode = row.LGD2014_code?.trim();
      const ladName = row.LGD2014_name?.trim();
      const dzCode = row.DZ2021_code?.trim(); // small area

      if (dzCode && ladCode) {
        SmallAreaToLAD[dzCode] = ladCode;
      }

      if (!seenLADs.has(ladCode) && ladCode && ladName) {
        LADToName[ladCode] = ladName;
        seenLADs.add(ladCode);
      }
    }

    // Scotland
    const sco = await csv(LADScotlandPath);
    for (let row of sco) {
      const ladCode = row.LA_Code?.trim();
      const ladName = row.LA_Name?.trim();
      const dzCode = row.DZ2011_Code?.trim(); // small area

      if (dzCode && ladCode) {
        SmallAreaToLAD[dzCode] = ladCode;
      }

      if (!seenLADs.has(ladCode) && ladCode && ladName) {
        LADToName[ladCode] = ladName;
        seenLADs.add(ladCode);
      }
    }

    ladLoaded = true;
    console.log("Loaded LAD names:", Object.keys(LADToName).length, LADToName);
    console.log("SmallArea → LAD mapping:", Object.keys(SmallAreaToLAD).length, SmallAreaToLAD);

  } catch (error) {
    console.error("Error loading LAD names:", error);
  }
}

function getAreaNameFromCode(code) {
  if (!code) return "Unknown";
  const ladCode = SmallAreaToLAD[code];
  if (!ladCode) return "Unknown LAD";
  const ladName = LADToName[ladCode];
  return ladName || "Unknown Name";
}

loadLADNames();

    function handleScroll() {
        const scrollY = window.scrollY;
        scrolledPastHeader = scrollY > 250;

        for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;

            const rect = el.getBoundingClientRect();
            const isInView = rect.top <= 150 && rect.bottom >= 150;

            if (isInView) {

                if (currentSection !== id) {
                posthog.capture('section entered (sef)', {
                    section_name: id,
                })};

                currentSection = id;
                // console.log("currentSection", currentSection);
                break;
            }
        }
    }


    onMount(() => {
        addSpinner(element);


        window.addEventListener('scroll', handleScroll); // header scroll listener

        handleScroll(); // initialize
        return () => window.removeEventListener('scroll', handleScroll);
    })

    onDestroy(() => {
        window.removeEventListener('scroll', handleScroll); // remove listener
    })


    async function loadData() {
        fullData = await getTableData(getSEFData(SEF));
        console.log("totals", fullData);
        LADfullData = await getTableData(getAverageSEFGroupedByLAD(SEF));
        console.log("LAD data 1 ", LADfullData);

        SEFData = await getTableData(getSEFbyCobenData(SEF));
        console.log("by cobens", SEFData);
        LADSEFData = await getTableData(allCBgetAverageSEFGroupedByLAD(SEF));
        console.log("LADsef", LADSEFData);

        PCData = await getTableData(getAggregationPerCapitaPerBenefit());
        console.log("per_capita_data", PCData);

        CBS.forEach(CB => {
            SEFData[CB] = +SEFData[CB];
        })

        dataLoaded = true;
        removeSpinner(element);
    }

    loadData().then(() => {
        map = new MapUK(fullData, "LSOA", mapDiv, "val", false, "Lookup_Value", false);
        map.initMap();

        // let legendSvg = map.legend();
        // mapLegendDiv.append(legendSvg)
    });

    let expanded = new Set();

    function toggle(id) {
        if (expanded.has(id)) {
            expanded.delete(id);
        } else {
            expanded.add(id);
        }
        // Force reactivity
        expanded = new Set(expanded);
    }

    // Setting up the data switches
    $: currentData = useLAD ? LADfullData : fullData;
    $: currentSEFData = useLAD ?  LADSEFData: SEFData;

    // Summary statistics
    $: averageValue = currentData
    ? (d3.mean(currentData, d => d.val) ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
    : "N/A";

    $: modeNumeric = currentData ? d3.mode(currentData, d => d.val) : null;

    $: labelLookup = SEF_LEVEL_LABELS[sefId];
    $: modeValue = modeNumeric != null && labelLookup
    ? labelLookup[modeNumeric] ?? modeNumeric
    : "N/A";

    $: maxIndex = currentData ? d3.maxIndex(currentData, d => d.val) : -1;
    $: maxLookupValue = maxIndex !== -1 && currentData
  ? currentData[maxIndex].Lookup_Value?.trim() ?? "N/A"
  : "N/A";
    $: maxValue = maxIndex !== -1 && currentData
    ? (currentData[maxIndex].val ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
    : "N/A";

    $: minIndex = currentData ? d3.minIndex(currentData, d => d.val) : -1;
    $: minLookupValue = minIndex !== -1 && currentData
  ? currentData[minIndex].Lookup_Value?.trim() ?? "N/A"
  : "N/A";
    $: minValue = minIndex !== -1 && currentData
    ? (currentData[minIndex].val ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
    : "N/A";

    $: maxName = ladLoaded && maxLookupValue !== "N/A"
  ? (currentData === LADfullData
      ? LADToName[maxLookupValue] ?? maxLookupValue
      : LADToName[SmallAreaToLAD[maxLookupValue]] ?? maxLookupValue)
  : "Loading...";

$: minName = ladLoaded && minLookupValue !== "N/A"
  ? (currentData === LADfullData
      ? LADToName[minLookupValue] ?? minLookupValue
      : LADToName[SmallAreaToLAD[minLookupValue]] ?? minLookupValue)
  : "Loading...";

  $: console.log("maxLookupValue:", maxLookupValue);
$: console.log("LAD name for maxLookupValue:", LADToName[maxLookupValue]);



  let loading = false;

  function toggleDataSource() {
    loading = true;

    // Simulate async loading
    setTimeout(() => {
      useLAD = !useLAD;
      loading = false;
    }, 1000);
  }

  let useLAD = true;

    function renderDistPlot() {
        const average = d3.mean(fullData, d => d.val) ?? 0;
        const maxY = d3.max(
            d3.bin().thresholds(20).value(d => d.val)(fullData),
            bin => bin.length
        );
        plotDist.innerHTML = "";

        plotDist?.append(
            Plot.plot({
                height: height / 1.9,
                width: height * 1.7,
                marginLeft: 60,
                marginTop: 30,
                marginRight: 20,
                marginBottom: 50,
                x: {label: `${sefUnits}`},
                y: {label: currentData === LADfullData ? 'No. of LADs' : 'No. of LSOAs', labelArrow: false},
                style: {fontSize: "16px"},
                marks: [
                    Plot.rectY(currentData, Plot.binX({y: "count"}, {
                        x: {value: "val", thresholds: 20},
                        fill: "black",
                        fillOpacity: 0.5,
                        stroke: "black",
                        srokeWidth: 5,
                    })),
                    Plot.ruleX([average], {
                                stroke: "#BD210E",
                                strokeWidth: 4,
                                channels: {average: {value: average, label: "Average"}},
                                tip: {format: {average:d => `${d.toFixed(2)}`, x:false}},
                            }),
                    //Plot.dot(fullData, {
                    //    x: {value: average, thresholds: 20},
                    //    y: maxY + 0.1 * maxY,
                    //    r: 5,
                    //   fill: "#BD210E"
//}),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            })
        );
    }

    function renderBarPlot() {

        const labelLookup = SEF_LEVEL_LABELS[sefId];

        const fullLevels = labelLookup
            ? Object.keys(labelLookup).map(Number)
            : currentData.filter(d => d["SEFMAME"] == sefId).map(d => d.SE);

        plotBar.innerHTML = "";

        plotBar?.append(
            Plot.plot({
                height: height / 1.9,
                width: height * 1.7,
                marginLeft: 60,
                marginTop: 30,
                marginRight: 20,
                marginBottom: sefId === "Typology" ? 80 : 50,
                x: {
                        domain: fullLevels,
                        label: SEF_SCALE(sefId),
                        tickFormat: d => labelLookup?.[d] ?? d,
                        tickRotate: sefId === "Typology" ? -10 : 0,
                        padding: 0.5
                    },
                //y: {label: currentData === LADfullData ? 'No. of LADs' : 'No. of LSOAs', labelArrow: false},
                style: {fontSize: "16px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75}),
                    //Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.barY(currentData, Plot.groupX({ y: "count" }, { x: "val", fill: "black", opacity: 0.5, tooltip: true, title: d => `Count: ${d.count}` })),
                    Plot.text(currentData, Plot.groupX({ y: "count", text: "count"}, {x: "val",
                                                                        text: d => d.count,
                                                                        dy: -15, // shift the text upward
                                                                        fill: "#333" ,
                                                                        fontWeight: 500})),
                    Plot.axisY({label: currentData === LADfullData ? 'No. of LADs' : 'No. of LSOAs', labelArrow: false})]
            })
        );
    }

    function renderDotPlot() {
        plotDot.innerHTML = "";
        plotDot?.append(
            Plot.plot({
                height: height * 1.5,
                width: height * 2,
                marginLeft: 60,
                marginTop: 60,
                marginRight: 10,
                marginBottom: 60,
                x: {grid: false},
                y: {grid: true},
                style: {fontSize: "16px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(currentData, {
                        x: sefId == "Rurality"? d => d.val + (Math.random() - 0.5) * 0.02 : d => d.val,
                        y: d => d.total_per_capita * 1000,
                        fill: d => d.total_per_capita < 0 ? '#BD210E'
                            : '#242424',
                        r:  currentData === LADfullData ? 4 : 0.9,
                        fillOpacity: 0.75,
                        channels: {
                            location: { value: d => currentData === LADfullData
                                        ? LADToName[d.Lookup_Value] || "Unknown"
                                        : getAreaNameFromCode(d.Lookup_Value), label: "Location" },
                            sef: { value: "val", label: `${sefUnits}` },
                            value: { value: d => d.total_per_capita * 1000, label: "Co-Benefit Value (£, thousand)" },
                        },
                        tip: { format: { location: true, sef: true, value: true, x: false, y: false } },
                        }),

                    Plot.axisY({
                        label: "Per capita co-benefit value (£, thousand)",
                        labelArrow: false,
                        labelAnchor: "center"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            })
        );
    }

    function renderJitterPlot() {
        plotJitter.innerHTML = "";
        plotJitter?.append(
            Plot.plot({
                height: height * 1.5,
                width: height * 2,
                marginLeft: 60,
                marginTop: 60,
                marginRight: 10,
                marginBottom: 60,
                x: {grid: false,
                    domain:
                    sefId == "EPC"? [0.5,7.5] :
                    sefId == "Tenure"? [0.5,3.5] :
                    sefId == "Typology"? [0.5,6.5]:
                    sefId == "Fuel_Type"? [0.5,3.5]:
                    sefId == "Gas_flag"?[-0.5,1.5]:
                    [-0.5,2.5]},
                y: {grid: true},
                style: {fontSize: "16px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    //Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(currentData, {
                        x: currentSEFData === LADSEFData ? d => d.val + (Math.random() - 0.5) * 0.2 : d => d.val + (Math.random() - 0.5) * 0.1 ,
                        y: d => d.total_per_capita * 1000,
                        fill: d => d.total_per_capita < 0 ? '#BD210E' : '#242424',
                        r: currentData === LADfullData ? 4 : 0.9,
                        fillOpacity: 0.75,
                        channels: {
                            location: { value: d => currentData === LADfullData
                                        ? LADToName[d.Lookup_Value] || "Unknown"
                                        : getAreaNameFromCode(d.Lookup_Value), label: "Location" },
                            sef: { value: "val", label: `${sefUnits}` },
                            value: { value: d => d.total_per_capita * 1000, label: "Co-Benefit Value (£, thousand)" },
                        },
                        tip: { format:
                            { location: true,
                            sef: false,
                            value: true,
                            x: false,
                            y: false } },
                    }),

                    Plot.axisY({
                        label: "Per capita co-benefit value (£, thousand)",
                        labelArrow: false,
                        labelAnchor: "center"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center", tickFormat: () => "", ticks: []}),
                    Plot.text([
                        {x: 0, y: 0,
                            text:
                            sefId == "Number_cars"? "0":
                            sefId == "Gas_flag"? "No":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 1, y: 0,
                            text:
                            sefId == "EPC"? "A" :
                            sefId == "Tenure"? "Owner":
                            sefId == "Typology"? "Semi-detached":
                            sefId == "Fuel_Type"? "Gas boiler":
                            sefId == "Gas_flag"? "Yes":
                            "1",
                            rotate: sefId === "Typology" ? -50 : 0,
                            fill: "#333", stroke: "white", fontWeight: "bold"},
                        {x: 2, y: 0,
                            text:
                            sefId == "EPC"? "B" :
                            sefId == "Tenure"? "Rented (social)":
                            sefId == "Typology"? "Detached":
                            sefId == "Fuel_Type"? "Electric heating":
                            sefId == "Number_cars"? "2":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 3, y: 0,
                            text:
                            sefId == "EPC"? "C" :
                            sefId == "Tenure"? "Rented (private)":
                            sefId == "Typology"? "Mid-terrace":
                            sefId == "Fuel_Type"? "Oil heating":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 4, y: 0,
                            text:
                            sefId == "EPC"? "D" :
                            sefId == "Typology"? "End-terrace":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 5, y: 0,
                            text:
                            sefId == "EPC"? "E" :
                            sefId == "Typology"? "Enclosed":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 5, y: -0.3,
                            text:
                            sefId == "Typology"? "end-terrace":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 6, y: 0,
                            text:
                            sefId == "EPC"? "F" :
                            sefId == "Typology"? "Enclosed":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 6, y: -0.3,
                            text:
                            sefId == "Typology"? "mid-terrace":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 7, y: 0,
                            text:
                            sefId == "EPC"? "G" :
                            "",
                            fill: "#333", fontWeight: "bold"}
                    ], {
                        x: "x",
                        y: "y",
                        text: "text",
                        fill: "fill",
                        fontWeight: "fontWeight",
                        dy: 15, // shift the text upward
                    })
                ]
            })
        );
    }

    function renderMultPlotDot() {
        CBS.forEach(CB => {
            let plot;
            plot = Plot.plot({
                height: height,
                width: height,
                marginLeft: CB === "Excess heat" ? 80 : 60,
                marginTop: 40,
                marginRight: 10,
                marginBottom: 50,
                x: {label: null},
                y: {label: null},
                style: {fontSize: "14px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(currentSEFData.filter(d => d["co_benefit_type"] == CB), {
                        x: sefId == "Rurality"? d => d.val + (Math.random() - 0.5) * 0.02 : d => d.val,
                        y: "total",
                        fill: COBENEFS_SCALE(CB),
                        fillOpacity: 0.5,
                        r: currentSEFData === LADSEFData ? 3.5 : 0.5,
                        channels: {
                            location: {value: d => currentData === LADfullData
                                        ? LADToName[d.Lookup_Value] || "Unknown"
                                        : getAreaNameFromCode(d.Lookup_Value), label: "Location" },
                            //sef: {value: "val", label: `${sefUnits}`},
                            //value: {value: d => d.total_per_capita * 1000, label: "Co-Benefit Value (£, thousand)"},
                        },
                        tip: {format: {
                            location: true,
                            //sef: true,
                            //value: true,
                            x: false,
                            y: false}},
                    }),
                    Plot.axisY({
                        label: "Per capita co-benefit value (£, thousand)",
                        labelArrow: false,
                        labelAnchor: "top"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            });
            plotSmallMult[CB]?.append(plot)
        })
    }

    function renderMultPlotJitter() {
        CBS.forEach(CB => {
            let plot;
            plot = Plot.plot({
                height: height,
                width: height,
                marginLeft: CB == "Excess heat" ? 70:60,
                marginTop: 40,
                marginRight: 10,
                marginBottom: 50,
                x: {grid: false,
                    domain:
                    sefId == "EPC"? [0.5,7.5] :
                    sefId == "Tenure"? [0.5,3.5] :
                    sefId == "Typology"? [0.5,6.5]:
                    sefId == "Fuel_Type"? [0.5,3.5]:
                    sefId == "Gas_flag"?[-0.5,1.5]:
                    [-0.5,2.5]},
                y: {label: null},
                style: {fontSize: "14px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    //Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(currentSEFData.filter(d => d["co_benefit_type"] == CB), {
                        x: currentSEFData === LADSEFData ? d => d.val + (Math.random() - 0.5) * 0.1 : d => d.val + (Math.random() - 0.5) * 0.2 ,
                        y: "total",
                        fill: COBENEFS_SCALE(CB),
                        fillOpacity: 0.5,
                        r: currentSEFData === LADSEFData ? 3.5 : 0.5,
                        channels: {
                            location: { value: d => currentData === LADfullData
                                        ? LADToName[d.Lookup_Value] || "Unknown"
                                        : getAreaNameFromCode(d.Lookup_Value), label: "Location" },
                            //sef: {value: "val", label: `${sefUnits}`},
                            //value: {value: d => d.total_per_capita * 1000, label: "Co-Benefit Value (£, thousand)"},
                        },
                        tip: {format: {
                            location: true,
                            //sef: true,
                            //value: true,
                            x: false,
                            y: false}},
                    }),
                    Plot.axisY({
                        label: "Per capita co-benefit value (£, thousand)",
                        labelArrow: false,
                        labelAnchor: "top"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center", tickFormat: () => "", ticks: []}),
                    Plot.text([
                        {x: 0, y: 0,
                            text:
                            sefId == "Number_cars"? "0":
                            sefId == "Gas_flag"? "No":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 1, y: 0,
                            text:
                            sefId == "EPC"? "A" :
                            sefId == "Tenure"? "Owner":
                            sefId == "Typology"? "S-D":
                            sefId == "Fuel_Type"? "Gas boiler":
                            sefId == "Gas_flag"? "Yes":
                            "1",
                            fill: "#333", fontWeight: "bold"},
                        {x: 2, y: 0,
                            text:
                            sefId == "EPC"? "B" :
                            sefId == "Tenure"? "Rented (social)":
                            sefId == "Typology"? "D":
                            sefId == "Fuel_Type"? "Electric heating":
                            sefId == "Number_cars"? "2":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 3, y: 0,
                            text:
                            sefId == "EPC"? "C" :
                            sefId == "Tenure"? "Rented (private)":
                            sefId == "Typology"? "M-T":
                            sefId == "Fuel_Type"? "Oil heating":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 4, y: 0,
                            text:
                            sefId == "EPC"? "D" :
                            sefId == "Typology"? "E-T":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 5, y: 0,
                            text:
                            sefId == "EPC"? "E" :
                            sefId == "Typology"? "EE-T":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 6, y: 0,
                            text:
                            sefId == "EPC"? "F" :
                            sefId == "Typology"? "EM-T":
                            "",
                            fill: "#333", fontWeight: "bold"},
                        {x: 7, y: 0,
                            text:
                            sefId == "EPC"? "G" :
                            "",
                            fill: "#333", fontWeight: "bold"}
                    ], {
                        x: "x",
                        y: "y",
                        text: "text",
                        fill: "fill",
                        fontWeight: "fontWeight",
                        dy: 15, // shift the text upward
                    })
                ]
            });
            plotSmallJitter[CB]?.append(plot)
        })
    }

    function formatValue(value, unit) {
        return unit === "£" ? `${unit}${value}` : `${value} ${unit}`;
    }

    function exportData() {
        let data = fullData;

        //data.push({co_benefit_type: "Total", val: data.reduce((a, b) => a + b.val, 0)})

       data.forEach(d => {
       delete d.scenario;

       //     d["Cobenefit Value (Millions £)"] = d.val;
       //     delete d["val"]
       })

        const csv = convertToCSV(data);
        downloadCSV(csv, `cobenefits_${sefId}.csv`);
        downloadStaticPDF(`${base}/Scotland_co-benefits_CB7_2045.pdf`, "readme.pdf"); // <-- adjust filename/path as needed
    }

$: {
    // Clean up existing plots
    plot?.firstChild?.remove();
    Object.values(plotSmallMult).forEach(multPlot => {
        multPlot.firstChild?.remove();
    });
    Object.values(plotSmallJitter).forEach(multPlot => {
        multPlot.firstChild?.remove();
    });

    // Render appropriate plots based on condition
    if (dataLoaded && currentData) {
        if (SEF_CATEGORICAL.includes(sefId)) {
            renderBarPlot();
            renderMultPlotJitter();
            renderJitterPlot();
        } else {
            renderDotPlot();
            renderMultPlotDot();
            renderDistPlot();
        }
    }
}
</script>

<NavigationBar></NavigationBar>

<div class="page-container" bind:this={element}>

    <div class="section header">
        <div class="header-content">
            <div class="header-text">
                <p class="page-subtitle">Socio-Economic Factor Report</p>
                <div class="title-container">
                    <h1 class="page-title">{sefdescr}</h1>
                    <p class="definition">{sefDef}</p>
                    <br>
                    <button

                        type="button"
                        class="data-btn"
                        on:click={exportData}
                >
                    Download Page Data
                </button>
                </div>
            </div>

            <div class="header-vis">
                {#if SEF_CATEGORICAL.includes(sefId)}
                <div class="plot" bind:this={plotBar}></div>
                {:else}
                <div class="plot" bind:this={plotDist}></div>
                {/if}
            </div>

            <div class="header-stats">
                <p class="definition-stat">
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    <h3 class="component-title">Distribution of {sefLabel.toLowerCase()} across the UK</h3>
                    {:else}
                    <h3 class="component-title">Distribution of {sefLabel.toLowerCase()} across the UK</h3>
                    Max value: <strong>{formatValue(maxValue, sefShortUnits)}</strong>
                    ({#if currentData == LADfullData}{LADToName[maxLookupValue]}{:else}{maxName}{/if})
                    {/if}
                </p>
                <p class="definition-stat">
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    &nbsp;
                    {:else}
                        Average value: <strong style="color: #BD210E;">{formatValue(averageValue, sefShortUnits)}</strong>
                    {/if}
                </p>
                <p class="definition-stat">
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    Most common category: <strong style="color: #BD210E;">{formatValue(modeValue, sefShortUnits)}</strong>
                    {:else}
                    Min value: <strong>{formatValue(minValue, sefShortUnits)}</strong>
                    ({#if currentData == LADfullData}{LADToName[minLookupValue]}{:else}{minName}{/if})
                    {/if}
                </p>
            </div>
        </div>
    </div>
<div class="button-wrapper">
    <button on:click={toggleDataSource} class="switch-button" disabled={loading}>
                    {#if loading}
                        <span class="spinner"></span>
                        Loading...
                    {:else}
                        {useLAD ?
                        'Currently the data for this page is grouped by local authorities (LADs), click here to switch to data zones (LSOAs).':
                        'Currently the data for this page is grouped by data zones (LSOAs), click here to switch to local authorities (LADs).'
                        }
                    {/if}
                    </button>
</div>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
        <span class="mini-header-text">
          {sefLabel} >>
        </span>
        <button on:click={toggleDataSource} class="switch-button-sticky" disabled={loading}>
            {#if loading}
                <span class="spinner"></span>
                Loading...
            {:else}
                {useLAD ?
                'Currently the data for this page is grouped by local authorities (LADs), click here to switch to data zones (LSOAs).':
                'Currently the data for this page is grouped by data zones (LSOAs), click here to switch to local authorities (LADs).'
                }
            {/if}
                </button>
            </div>
            <button

                    type="button"
                    class="data-btn-sticky"
                    on:click={exportData}
            >
                Download Page Data
            </button>
        </div>
    {/if}

    <!--<div class="section">
        <div class="radio-set">
            Select which level of data you'd like to view:<br/>
            <input type="radio" name="compare" value="LSOA" checked>
            <label class="nation-label" for="html">Data Zone (LSOA)</label><br>
            <input type="radio" name="compare" value="LAD">
            <label class="nation-label" for="html">Local Authority (LAD)</label><br>
        </div>
    </div>-->

    <div class="section">
        <div id="overview">
            <div class="section-header">
                <p class="section-subtitle">Overview</p>
            </div>
            <div id="vis-block">
                <div class="component column">
                    <h3 class="component-title">{sefLabel} against per capita co-benefit values (£, thousand)</h3>
                    <p class="description">Each point in the chart below represents a UK
                        {#if currentData == LADfullData}
                        local authority (LAD).
                    {:else}
                data zone (LSOA).
            {/if}</p>
                    <div class="aggregation-icon-container2">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{per_capita}" alt="icon"/>
                            <span class="tooltip-text">This chart uses per capita values. i.e. shows the cost/benefit per person in each area.</span>
                            </div>
                            {#if !useLAD}
                            <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{negative}" alt="icon" />
                            <span class="tooltip-text-neg">This chart includes negative values.</span></div>
                            {/if}

                    </div>
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    <div class="plot" bind:this={plotJitter}></div>
                    {:else}
                    <div class="plot" bind:this={plotDot}></div>
                    {/if}
                </div>
                <div class="component column">
                    <h3 class="component-title">{sefLabel} at data zone (LSOA) level</h3>
                    <p class="description">Scroll for zooming in and out.</p>
                    <div class="aggregation-icon-container2">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{per_capita}" alt="icon" />
                            <span class="tooltip-text">These charts use per capita values. i.e. show the cost/benefit per person in each area.</span>
                        </div>
                    </div>
                    {#if map}
                        <div id="legend">
                            {@html map.legend(sefUnits).outerHTML}
                        </div>
                    {/if}
                    <div id="map" bind:this={mapDiv}></div>

                </div>
            </div>
        </div>
    </div>

    <div id="compare">
        <!-- <div class="section-header">
        <p class="section-subtitle">Compare by socio-economic factor</p>
        </div> -->

        <div class="section-header">
            <p class="section-subtitle">By Co-benefits</p>
        </div>
        <div id="se-block" class="component" style="margin-left: 1rem;">
            <div id="se-title">
                <h3 class="component-title">Plotting
                    <!--<span style="background-color: #555; padding: 0 1px; color:#f9f9f9">-->
                    {sefLabel.toLowerCase()}
                <!--</span> -->
                against the gain/loss (£, thousand) per capita for each co-benefit</h3>
                <p class="explanation">Each plot shows the distribution of benefits or costs for each of the 11 co-benefits.</p>
                <br>

                <!-- Legend -->
                <div id="main-legend" class="legend-box">
                    <strong>Co-benefits:</strong><br>Expand for detailed explanation
                    <div style="height: 0.8em;"></div>
                        {#each CO_BEN as CB}
                        <div class="legend-item">
                            <div class="legend-header" on:click={() => {
                                const wasExpanded = expanded.has(CB.id);
                                toggle(CB.id);

                                if (!wasExpanded) {
                                    posthog.capture('cobenefit opened', {
                                        cobenefit: CB.label
                                    });
                                } else {
                                    posthog.capture('cobenefit closed', {
                                        cobenefit: CB.label
                                    });
                                }
                            }} style="cursor: pointer;">
                                <span class="legend-color" style="background-color: {COBENEFS_SCALE(CB.id)};"></span>
                                <span class="legend-text {expanded.has(CB.id) ? 'expanded' : ''}" >{CB.label}</span>
                                <span class="toggle-icon">{expanded.has(CB.id) ? "▲" : "▼"}</span>
                            </div>
                            {#if expanded.has(CB.id)}
                            <div class="legend-description-box">
                            <div class="legend-description">
                                <div style="height: 0.8em;"></div>
                                {CB.def} <br>

                                <a class="link" href="{base}/cobenefit?cobenefit={CB.id}" target="_blank" rel="noopener noreferrer" style= "color:{COBENEFS_SCALE(CB.id)}; text-decoration: underline">{CB.id} report page</a>

                            </div>
                            </div>
                            {/if}
                        </div>
                        {/each}
                    </div>
                    <!-- Disclaimer -->
                <div id="se-disclaimer" class="disclaimer-box">
                    <p style="margin: 0 0 1rem 0;"><strong>Correlation ≠ Causation:</strong> The scatter plots represent modelled associations and should not be interpreted as direct causal relationships. </p>
                    <p style="margin: 0 0 1rem 0;"><strong>Varying y-axis scales:</strong> The scatter plots have different scales on the y-axis due to the nature of each co-benefit. </p>
                </div>
                </div>



            <div id="multiple-comp">
                <div id="multiple-plots">
                    {#each CO_BEN as CB}
                        <div class="plot-container">
                            <div class="component-chart-title-container">
                            <img class="sm-cb-icon" src={getIconFromCobenef(CB.id)} alt="{CB.label} icon" />
                            <h3 class="chart-component-title">{CB.label}</h3>
                            {#if CB.id == "Longer travel times"  || CB.id == "Road repairs" || CB.id == "Road safety" || CB.id == "Congestion" || CB.id == "Excess heat"}

                                <div class="tooltip-wrapper">
                                    <img class="sm-icon" src="{per_capita}" alt="icon" />
                                    <span class="tooltip-text">This chart uses per capita values. i.e. show the cost/benefit per person in each area.</span>
                                </div>

                            <div class="tooltip-wrapper">
                                    <img class="sm-icon" src="{negative}" alt="icon" />
                                    <span class="tooltip-text-neg">This chart includes negative values.</span>
                                </div>
                            {:else}
                            <div class="tooltip-wrapper">
                            <img class="sm-icon" src="{per_capita}" alt="icon" />
                            <span class="tooltip-text">This chart uses per capita values. i.e. show the cost/benefit per person in each area.</span>
                        </div>
                            {/if}
                        </div>
                            <div class="chart-shell">
                                {#if SEF_CATEGORICAL.includes(sefId)}
                                    <div class="plot" bind:this={plotSmallJitter[CB.id]}></div>
                                {:else}
                                    <div class="plot" bind:this={plotSmallMult[CB.id]}></div>
                                {/if}
                            </div>
                            <!-- chart badges intentionally disabled on this page -->
                        </div>
                    {/each}
                </div>
            </div>
        </div>
        </div>
</div>

<Footer></Footer>

<style>

    .section.header {
        padding: 2% 6%;
        background-color: #f9f9f9;
    }

    .section-subtitle {
        font-size: 1.3rem;
        font-weight: bold;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 5px;
        margin-top: 0px;
    }

    .header-content {
        display: flex;
        align-items: top;
        justify-content: space-between;
        flex-wrap: wrap;
        flex-direction: row; /* or column, depending on your layout */
        gap: 2rem; /* adjust spacing between children */
        align-items: flex-start;
    }

    .header-text {
        max-width: 30%;
        height: 100%;
    }

    .header-vis {
    text-align: left;
    flex: 1;
    margin-left: 0rem;        /* pushes it to the far right */
    margin-top: 1rem;         /* moves it down slightly */
    padding-right: 0rem;
    padding-left: 0rem;    /* adds space from the right edge */
    flex-grow: 1;
    flex-shrink: 0;
    flex-basis: auto;
    max-width: 40%;
    }

    .header-stats {
    text-align: left;
    flex: 1;
    margin-left: 0rem;        /* pushes it to the far right */
    margin-top: 2rem;         /* moves it down slightly */
    padding-right: 0rem;
    padding-left: 0rem;    /* adds space from the right edge */
    line-height: 2;
    }

    .page-subtitle {
        font-size: 1.2rem;
        color: #777;
        margin-bottom: 2rcap;
    }

    .page-title {
        font-size: 1.7rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
    }

    #vis-block {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1%;
        /* width: 98%; */
        padding-left: 1%;
        padding-right: 1%;
        padding-bottom: 1%;
    }

    .radio-set {
        margin: 10px 10px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .nation-label {
        /*color: #90bcca;*/
        color: #777;
    }

    .plot {
        margin-top: 0px; /* pull it upward */
    }

    .plot-dot {
        margin-top: -80px; /* pull it upward */
    }

    .definition-stat {
        font-size: 18px;
        font-weight: semibold;
        color: #555;
        max-width: 800px;
        margin: 0;
    }

    #map {
        width: 100%;
        height: 83%;
    }

    #multiple-plots {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        justify-items: start;
    }

    #multiple-comp {
        /* grid-column: span 2 / span 2; */
        width: 100%;
        padding: 1rem 0;
    }


    .plot-container {
        width: 100%;
        margin-bottom: 20px;
    }

    .chart-shell {
        position: relative;
        width: 100%;
    }

    .chart-badges {
        display: flex;
        justify-content: flex-end;
        gap: 0px;
        margin-top: 6px;
        pointer-events: auto;
        opacity: 0.98;
    }

    .component-chart-title {
        font-size: 1.2rem;
        font-weight: bold;
        margin: 0;
        margin-bottom: 10px;
        text-align: left;
    }

    .component-chart-caption {
        font-size: 0.9rem;
        line-height: 1.1rem;
        color: #555;
        margin: 0 0 15px 0;
        text-align: left;
    }

    #se-block {
        display: flex;
        /* width: 100%; */
        flex-direction: row;
        min-height: 100vh;
    }

    #se-title {
        /* min-width: 25vw; */
        /* width: 30vw; */
        width: 400px;
        margin-left: 1rem;
        /* margin-right: 2rem; */
        margin-right: 50px;
        position: sticky;
        top: 120px;
        align-self: flex-start;
        height: fit-content;
    }

    .legend-color {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        border-radius: 2px;
    }

    .legend-box {
        margin-bottom: 2rem;
        padding: 0.75rem;
        background-color: #f0f0f0;
        border-radius: 8px;
        font-size: 1.1rem;
    }
    .horizontal-legend-list {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 2px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .legend-item {
    margin-bottom: 0.6em;
}

.legend-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
}

.legend-color {
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 2px;
}

.legend-text {
    font-weight: 300;
    font-size: 1rem;
}

.toggle-icon {
    margin-left: auto;
    font-size: 0.8em;
    opacity: 0.6;
}

.legend-description {
    margin-left: 0.1em;
    margin-right: 0em;
    padding: 1em;
    padding-top: 0em;
    font-size: 0.8em;
    color: #555;
}
.legend-description-box {
    margin: 0.5em 0em;
    background-color: #f9f9f9;
    border-radius: 4px;
}

.aggregation-icon-container2 {
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    width: 99%;
    margin-top: -10px;
    margin-bottom: -30px;
    margin-right: 10px;
    margin-left:0px;
  }

  .legend-text.expanded {
  font-weight: 400;
}

.disclaimer-box {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #f9f9f9;
    border-left: 4px solid #ccc;
    font-size: 0.9rem;
    color: #555;
}

.sm-icon {
    width: 20px;
    height: 20px;
    opacity: 0.75;
    margin-top: 5px;
    margin-left: 3px;
}

.sm-cb-icon {
    width: 30px;
    height: 30px;
    opacity: 0.75;
    margin-top: -5px;
    margin-left: 3px;
}

.component-chart-title-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-text-neg {
    visibility: hidden;
    background-color: #BD210E;
    color: #fff;
    font-size: 12px;
    padding: 5px 8px;
    border-radius: 4px;
    position: absolute;
    top: 35px;
    right: -60px;
    left: -60px;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.2s ease;
    max-width: 200px;
    white-space: normal;
    word-break: break-word;
    display: inline-block;
}

  .switch-button {

    padding: 8px 14px;
    background-color: rgb(255, 255, 255);
    color: #333;
    border-color: #d3d3d3;
    border-width: 0.5px;
    border-radius: 6px;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: -5px;
    justify-content: center;
    max-width: 1000px;
  }

  .switch-button:hover:not(:disabled) {
    background-color: #555;
    color: white;
  }

  .switch-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

    .switch-button-sticky {
    position: relative;
    padding: 4px 10px;
    background-color: #777;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: -5px;
    justify-content: center;
    min-width: 200px;
    margin-top: 4px;
    box-shadow: #d3d3d3 0px 0px 6px 0px;
  }

  .switch-button-sticky:hover:not(:disabled) {
    background-color: #555;
  }

  .switch-button-sticky:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #fff;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .button-wrapper {
  display: flex;
  justify-content: left;
  padding-left: 6rem;
  width: 100%;
  margin-top: 1rem;
  margin-bottom: 0rem;
}
</style>
