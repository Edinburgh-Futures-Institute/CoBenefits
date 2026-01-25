<script lang="ts">
    import * as d3 from 'd3';
    import * as Plot from "@observablehq/plot";
    import {onMount, onDestroy} from 'svelte';
    import {base} from "$app/paths";
    import {page} from '$app/stores';
    import posthog from 'posthog-js';

    import {MapUK} from "$lib/components/mapUK";
    import {
        SEF,
        SEF_CATEGORICAL,
        type SEFactor,
        VIS_COLOR,
        AVERAGE_COLOR,
        MARGINS,
        AVERAGE_DX,
        SCENARIOS,
        type Scenario,
        TIMES,
        COBENEFS_RANGE,
        COBENEFS,
        COBENEFS_SCALE,
        // removeSpinner,
        // addSpinner,
        SEF_SCALE,
        getIconFromCobenef,
        COBENEFS_SCALE2,
        SE_FACTORS, SEF_LEVEL_LABELS, convertToCSV, downloadCSV
    } from "../../globals";
    import {getRandomSubarray} from "$lib/utils";

    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import ChartSkeleton from "$lib/components/ChartSkeleton.svelte";
    import Badge from '$lib/badge/Badge.svelte';
    import {
        BACKGROUND_READING_BADGE,
        CAN_FILTER_BADGE,
        COMPARISON_AVERAGE_BADGE,
        CORRELATION_NOT_CAUSATION_BADGE,
        DISCRETE_SCALES_BADGE,
        INTERACTIVE_BADGE,
        INVISIBLE_SMALL_AREAS_BADGE,
        makeSEFChartBadge,
        MODELLED_DATA_BADGE,
        OPEN_DATA_BADGE,
        RAW_DATA_AVAILABLE_BADGE,
        SEF_BARCHART_BADGE,
        SMOOTHED_DATA_BADGE
    } from '$lib/badge/badges';
    // (Chart badges currently shown only on the co-benefit pages)
    import {
        getAllCBAllDatazones, getAllCBForOneLAD,
        getAverageCBGroupedByLAD,
        getSUMCBGroupedByLAD, getSUMCBGroupedByLADAndCB,
        getTableData, getTopSelectedLADs,
        getTotalCBAllDatazones, getTotalCBForOneLAD
    } from "$lib/duckdb";
    import Footer from "$lib/components/Footer.svelte";
    import {csv} from "d3";
    import {downloadStaticPDF} from "../../globals.js";

    let sectionRefs = {
        head: null,
        overview: null,
        temporal: null,
        breakdown: null,
        households: null
    };

    let element: HTMLElement
    let plotDist: HTMLElement
    let plotPerCb: HTMLElement
    let plotPerCBPerLSOA;
    let heatmapPlot: HTMLElement
    let CBOverTimePLot: HTMLElement
    let CBOverTimePerScenarioPLot: HTMLElement
    let CBOverTimePerCBPLot: HTMLElement
    let SEFPlotLAD: Record<SEFactor, HTMLElement> = {};
    let SEFPlotFullDistrib: Record<SEFactor, HTMLElement> = {};
    let SEFPlotPerCB: Record<SEFactor, HTMLElement> = {};
    let scenarioXcoBenefPLots: Record<Scenario, HTMLElement> = {};
    let chartType: "barchart" | "boxplot" | "distribution" = "barchart"
    let isSEFAggregated = false;
    const LSOACodeToName: Record<string, string> = {};
    const LADToName: Record<string, string> = {};

    let height = 400;

    // Data from load function
    export let data;

    const LAD = data.LAD;
    let compareTo: "UK" | "England" | "Wales" | "NI" | "Scotland" = "UK"

    let totalCBAllZones;
    let allCBsAllZones;
    let totalCBAllLAD;

    let allCBAllLAD;

    let allCBAllLADSUM;

    let oneLADData;
    let oneLADAllCbs;

    let totalValue: number | null = null;
    let totalValuePerCapita: number | null = null;
    let totalValueMax: number | null = null;
    let totalValuePerCapitaMax: number | null = null;
    let totalValueMean: number | null = null;
    let totalValuePerCapitaMean: number | null = null;


    let dataLoaded = false;

    let selectedCoBenefit = "Noise"; // default
    let selectedLSOA = "";
    let allCoBenefitTypes = [];

    // Search state
    let searchInput = "";
    let searchResults = [];
    $: areaNameForBadges = LADToName[LAD] ?? LAD;

    const DIST_PLOT_HEIGHT = Math.round(height / 1.6);
    const STANDARD_PLOT_HEIGHT = Math.round(height / 1.0);
    const TALL_PLOT_HEIGHT = Math.round(height);

    async function loadData() {
        totalCBAllZones = await getTableData(getTotalCBAllDatazones());

        allCBsAllZones = await getTableData(getAllCBAllDatazones());

        totalCBAllZones.forEach(datazone => {
            datazone.isPageLAD = (datazone.LAD == LAD) ? true : false
        })

        totalCBAllLAD = await getTableData(getSUMCBGroupedByLAD([]));

        allCBAllLAD = await getTableData(getAverageCBGroupedByLAD(COBENEFS.map(d => d.id)));

        allCBAllLADSUM = await getTableData(getSUMCBGroupedByLADAndCB());

        oneLADData = await getTableData(getTotalCBForOneLAD(LAD));
        // console.log("oneLADData", oneLADData)
        oneLADAllCbs = await getTableData(getAllCBForOneLAD(LAD));


        // Total co-benefits in £ billions (rounded for display)
        const totalBillions = d3.sum(oneLADData, (d) => d.total) / 1000;
        totalValue = Number(totalBillions.toFixed(3));

        totalValueMax = (d3.max(totalCBAllLAD, (d) => d.val) ?? 0) / 1000;

        // This is an approximation
        const perCapita = (d3.mean(oneLADData, (d) => d.totalPerCapita) ?? 0) * 1000000;
        totalValuePerCapita = Number(perCapita.toFixed(1));

        totalValuePerCapitaMax = await getTableData(getTopSelectedLADs({limit: 1, sortBy: "per_capita"}));
        totalValuePerCapitaMax = Number(totalValuePerCapitaMax?.[0]?.value_per_capita ?? 0);

        const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`;
        const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`;
        const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`;

        try {
            const eng = await csv(LADEngPath);
            eng.forEach((row: any) => {
                LADToName[row.LAD22CD] = row.LAD22NM;
                LSOACodeToName[row.LSOA21CD] = row.LSOA21NM;
            });

            const ni = await csv(LADNIPath);
            ni.forEach((row: any) => {
                LADToName[row.LGD2014_code] = row.LGD2014_name;
                LSOACodeToName[row.DZ2021_code] = row.DZ2021_name;
            });

            const sco = await csv(LADScotlandPath);
            sco.forEach((row: any) => {
                LADToName[row.LA_Code] = row.LA_Name;
                LSOACodeToName[row.DZ2011_Code] = row.DZ2011_Name;
            });
        } catch (e) {
            console.error('Failed to load LAD/LSOA name CSVs', e);
        }

        dataLoaded = true;
    }


    $: {
        if (totalCBAllLAD) {
            totalValueMean = (d3.mean(totalCBAllLAD.map(d => d.val)) ?? 0) / 1000;
            totalValuePerCapitaMean = (d3.mean(totalCBAllLAD.map(d => d.value_per_capita)) ?? 0) * 100000;
        }
    }

    async function initLSOAMapAfterLoad() {
        if (!mapLSOADiv) return;
        if (!oneLADData || !Array.isArray(oneLADData) || oneLADData.length === 0) return;
        mapLSOA = new MapUK(oneLADData, "LSOA", mapLSOADiv, "total", false, "Lookup_Value", false, null, 8);
        mapLSOA.initMap(true, false);
        mapLSOA.setCenter(oneLADData[0].LAD);
    }

    let scrolledPastHeader = false;
    let currentSection = '';
    const sectionIds = ['overview', 'temporal', 'households', 'breakdown'];

    function handleScroll() {
        const scrollY = window.scrollY;
        scrolledPastHeader = scrollY > 100;

        for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;

            const rect = el.getBoundingClientRect();
            const isInView = rect.top <= 150 && rect.bottom >= 150;

            if (isInView) {

                if (currentSection !== id) {
                    posthog.capture('section entered (lad)', {
                        section_name: id,
                    })
                }
                ;

                currentSection = id;
                // console.log("currentSection", currentSection);
                break;
            }
        }
    }

    function formatLabel(id: string): string {
        const labels: Record<string, string> = {
            overview: 'Overview',
            temporal: 'Temporal trends',
            breakdown: 'Breakdown by co-benefit',
            households: 'Household benefits'
        };
        return labels[id] || '';
    }

    let map: MapUK;
    let mapDiv: HTMLElement;

    let mapLSOA: MapUK;
    let mapLSOADiv: HTMLElement;

    onMount(() => {
        map = new MapUK(LAD, "LAD", mapDiv, "val", true, "Lookup_value", false, null, 8);
        map.initMap(false);

        // Start loading in the background (non-blocking).
        void loadData().then(() => {
            // Needs to be initialised after data loading
            void initLSOAMapAfterLoad();
        });

        window.addEventListener('scroll', handleScroll); // header scroll listener

        handleScroll(); // initialize
        return () => window.removeEventListener('scroll', handleScroll);
    })

    onDestroy(() => {
        window.removeEventListener('scroll', handleScroll); // remove listener
    })

    function makeLADBarSVG(value: number, max: number, fill = "black") {
        const v = Number.isFinite(value) ? value : 0;
        const m = Number.isFinite(max) ? max : 0;
        const safeMax = m > 0 ? m : Math.max(v, 1);
        const plot = Plot.plot({
            width: 80,
            height: 20,
            margin: 0,
            x: {domain: [0, safeMax], axis: null},
            marks: [
                Plot.barX([v], {
                    x: d => d,
                    y: 0,
                    fill: fill
                })
            ]
        });
        return plot.outerHTML;
    }

    function renderDistributionPlot(totalCBAllZones, oneLADData) {
        if (!totalCBAllZones || !oneLADData) return;

        let filtered = totalCBAllZones.filter(d => d.total < 20);

        const plot = Plot.plot({
            height: height / 1.6,
            ...MARGINS,
            marginBottom: 40,
            marginTop: 40,
            style: {fontSize: "15px"},
            y: {grid: true},
            marks: [
                Plot.areaY(filtered, Plot.binX({
                    y: (a, bin) => {
                        return a.length / filtered.length / (bin.x2 - bin.x1);
                    }
                }, {
                    x: "total",
                    fill: AVERAGE_COLOR,
                    stroke: AVERAGE_COLOR,
                    fillOpacity: 0.3,
                    strokeWidth: 2
                })),
                Plot.areaY(oneLADData, Plot.binX({
                    y: (a, bin) => {
                        return a.length / oneLADData.length / (bin.x2 - bin.x1);
                    }
                }, {
                    x: "total",
                    tip: true,
                    fill: VIS_COLOR,
                    stroke: "black",
                    fillOpacity: 0.3,
                    strokeWidth: 2
                })),
                Plot.ruleX([0], {stroke: "#1E1E1E", strokeWidth: 1}),
                Plot.axisY({label: "Distribution of data zones (Normalized)", labelAnchor: "top", labelArrow: false}),
                Plot.axisX({label: "Cobenefit (millions £)", labelAnchor: "center", labelArrow: false}),
            ]
        });
        return plot.outerHTML;
    }

    function renderPlot() {
        if (chartType == "boxplot") {
            plotDist?.append(
                Plot.plot({
                    height: height / 1.4,
                    ...MARGINS,
                    x: {type: "band"},
                    style: {fontSize: "18px"},
                    marks: [
                        Plot.boxY(oneLADData, {y: "total", x: "scenario", tip: true}),
                        // Plot.tickX([{totalCBAllZones, scenario: "BNZ"}], {y: "scenario", x:'v', stroke: 'red'}),

                        //  Median and Mean from ALL datazones
                        Plot.tickY(
                            totalCBAllZones,
                            Plot.groupX(
                                {y: "median"},
                                {y: "total", x: "scenario", stroke: "blue", strokeWidth: 2}
                            )
                        ),
                        Plot.tickY(
                            totalCBAllZones,
                            Plot.groupX(
                                {y: "mean"},
                                {y: "total", x: "scenario", stroke: "red", strokeWidth: 2}
                            )
                        )
                    ]
                }))
        } else if (chartType == "barchart") {
            let pl = Plot.plot({
                height: height / 1.4,
                ...MARGINS,
                x: {type: "band"},
                style: {fontSize: "18px"},
                marks: [
                    Plot.barY(
                        totalCBAllLAD,
                        Plot.groupX(
                            {y: "mean"},
                            {y: "val", x: "scenario", fill: "lightblue", opacity: 0.7, dx: 20}
                        )
                    ),
                    Plot.barY(oneLADData, Plot.groupX({y: "sum"}, {
                        y: "total",
                        x: "scenario",
                        tip: true
                    })),

                    //  Median and Mean from ALL datazones
                    // Plot.tickY(
                    //     totalCBAllLAD,
                    //     Plot.groupX(
                    //         {y: "mean"},
                    //         {y: "val", x: "scenario", stroke: "red", strokeWidth: 2}
                    //     )
                    // ),
                    // Plot.tickY(
                    //     totalCBAllLAD,
                    //     Plot.groupX(
                    //         {y: "median"},
                    //         {y: "val", x: "scenario", stroke: "blue", strokeWidth: 2}
                    //     )
                    // )

                ]
            })
            // );
            // console.log("debug", pl)

            plotDist?.append(pl);

            setTimeout(() => {
                const rects = d3.select(pl)
                    .selectAll("g[aria-label='bar']")
                // .selectAll("g")

                const rects1 = d3.select(rects.nodes()[0])
                const rects2 = d3.select(rects.nodes()[1])

                // // Move all children of groupB into groupA
                rects2.selectAll("rect").each(function () {
                    // console.log(2, this)
                    // rects1.node().appendChild(this);
                });
                //
                rects2.remove();

            }, 1000)


        } else if (chartType == "distribution") {
            plotDist?.append(
                Plot.plot({
                    height: height / 1.4,
                    ...MARGINS,
                    y: {label: "Datazones Frequency"},
                    style: {fontSize: "18px"},
                    facet: {data: totalCBAllZones, y: "scenario"},
                    marks: [
                        Plot.areaY(oneLADData, Plot.binX({y: "count"}, {
                            x: "total",
                            tip: true
                        })),
                        //  Median and Mean from ALL datazones
                        Plot.ruleX(
                            totalCBAllZones,
                            Plot.groupY(
                                {x: "median"},
                                {x: "total", y1: 0, y2: 1500, fy: "scenario", stroke: "blue", strokeWidth: 3}
                            )
                        ),
                        // Plot.tickX(
                        //     totalCBAllZones,
                        //     Plot.groupY(
                        //         {x: "mean"},
                        //         {x: "total", stroke: "red", strokeWidth: 2}
                        //     )
                        // )
                    ]
                })
            );

        }
    }

    function renderPerCobenefPlot() {

        if (plotPerCb) {
            let plot = Plot.plot({
                height: height / 1,
                width: 811,
                ...MARGINS,
                marginBottom: 80,
                marginTop: 30,
                x: {type: "band", padding: 0.6},
                y: {grid: true},
                style: {fontSize: "14px"},
                color: {legend: false, range: COBENEFS_SCALE.range(), domain: COBENEFS_SCALE.domain()},
                marks: [
                    // Plot.barY(allCBAllLAD, Plot.groupX({y: "mean"}, {
                    //     y: "val",
                    //     x: "co_benefit_type",
                    //     dx: AVERAGE_DX,
                    //     fill: AVERAGE_COLOR,
                    //     tip: true
                    // })),
                    // Plot.barY(allCBAllZones, Plot.groupX({y: "sum"}, {
                    //     y: "total",
                    //     x: "co_benefit_type",
                    //     dx: AVERAGE_DX,
                    //     fill: AVERAGE_COLOR,
                    //     tip: true
                    // })),
                    Plot.barY(allCBAllLADSUM, Plot.groupX({y: "mean"}, {
                        y: "val",
                        x: "co_benefit_type",
                        dx: 12,
                        fill: AVERAGE_COLOR,
                        sort: {x: "y", reverse: true},
                        tip: true,
                    })),
                    Plot.barY(oneLADAllCbs, Plot.groupX({y: "sum"}, {
                        y: "total",
                        x: "co_benefit_type",
                        dx: -12,
                        fill: d => COBENEFS_SCALE(d["co_benefit_type"]),
                        tip: true,
                        tipoffset: 10,
                        fillOpacity: 0.8
                    })),
                    Plot.axisY({label: 'Total Co-Benefit (£ million)', labelAnchor: "center", labelArrow: false}),
                    Plot.axisX({label: 'Co-Benefit Type', tickRotate: 25, labelAnchor: "center", labelArrow: false}),
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75}),

                ]
            })

            d3.select(plot)
                .select('g[aria-label="x-axis tick label"]')
                .selectAll("text")
                .style("cursor", "pointer")
                .on("click", (event, i, d) => {
                    let text = event.target.textContent;
                    let cb = COBENEFS.find((d) => d.id == text)
                    window.open(`${base}/cobenefit?cobenefit=${cb.id}`, '_blank').focus();
                })

            plotPerCb.append(plot)
        }
    }


    onMount(() => {
        console.log("onMount ran");
        console.log("oneLADAllCbs is:", oneLADAllCbs);

        if (oneLADAllCbs && oneLADAllCbs.length > 0) {
            allCoBenefitTypes = [...new Set(oneLADAllCbs.map(d => d.co_benefit_type))];
            selectedCoBenefit = allCoBenefitTypes[0];
            console.log("Loaded co-benefits:", oneLADAllCbs);
        }
    });
    $: if (oneLADAllCbs && oneLADAllCbs.length > 0 && allCoBenefitTypes.length === 0) {
        allCoBenefitTypes = [...new Set(oneLADAllCbs.map(d => d.co_benefit_type))];
        selectedCoBenefit = allCoBenefitTypes[0];
        console.log("Loaded co-benefits reactively:", oneLADAllCbs);
    }

$: if (dataLoaded && selectedCoBenefit && searchInput.length >= 1) {
    const lsoaSet = new Set(
        oneLADAllCbs
            .filter(d => d.co_benefit_type === selectedCoBenefit)
            .map(d => d.Lookup_Value)
    );

    const allResults = [...lsoaSet].map(code => ({
        code,
        name: LSOACodeToName[code.trim()] || code
    }));

    searchResults = allResults.filter(entry =>
        entry.name.toLowerCase().includes(searchInput.toLowerCase())
    );

    searchResults.sort((a, b) => a.name.localeCompare(b.name));
} else {
    searchResults = [];
}
 function selectLSOA(entry) {
    selectedLSOA = entry.code;
    searchInput = "";
    searchResults = [];
    renderPerCBPerLSOA();
}

    function renderPerCBPerLSOA() {
        if (!plotPerCBPerLSOA) return;

        plotPerCBPerLSOA.innerHTML = "";

        const filteredData = oneLADAllCbs.filter(d => d.co_benefit_type === selectedCoBenefit);
        const sortedData = d3.sort(filteredData, d => -d.total);

        const selectedDatum = sortedData.find(d => d.Lookup_Value === selectedLSOA?.trim());
console.log("selectedDatum", selectedDatum)
        const plot = Plot.plot({
            height: 500,
            width: 800,
            marginBottom: 50,
            marginTop: 30,
            marginLeft: 50,
            x: {grid: true},
            style: {fontSize: "14px"},
            color: {
                legend: false,
                range: COBENEFS_SCALE.range(),
                domain: COBENEFS_SCALE.domain()
            },
            marks: [
                Plot.rectY(sortedData, Plot.binX({y: "count"}, {
                    x: "total",
                    thresholds: 50,
                    fill: d => COBENEFS_SCALE(d.co_benefit_type),
                    fillOpacity: 0.5
                })),
                ...(selectedDatum
                    ? [
                        Plot.ruleX([selectedDatum.total], {
                            stroke: COBENEFS_SCALE2(selectedDatum.co_benefit_type)[2],
                            strokeWidth: 3,
                            strokeDasharray: "5,5",
                            tip: true
                        }),
                        Plot.text([selectedDatum], {
                            x: "total",
                            y: 0,
                            text: d => LSOACodeToName[d.Lookup_Value] || d.Lookup_Value,
                            dy: -10,
                            fill: COBENEFS_SCALE2(selectedDatum.co_benefit_type)[1],
                            stroke: "white", // outline color
                            strokeWidth: 2,  // outline thickness
                            fontWeight: "bold",
                            textAnchor: "middle"
                        })
                        ]
                    : []),

                Plot.axisX({label: "Total Co-Benefit (£ million)", labelAnchor: "center", labelArrow: false}),
                Plot.axisY({label: "Number of Datazones",labelArrow: false}),
                Plot.ruleX([0], {stroke: "#333", strokeWidth: 1.75})
            ]
        });

        plotPerCBPerLSOA.appendChild(plot);
    }

    function renderSEFPlot() {
        SEF.forEach(sef => {
            let plot
            let plotFullDistrib;

            if (isSEFAggregated) {
                if (SEF_CATEGORICAL.includes(sef)) {
                    plot = Plot.plot({
                        height: height / 3,
                        width: 500 * 2,
                        ...MARGINS,
                        // y: {grid: true, label: "mean value (£)"},
                        style: {fontSize: "18px"},
                        color: {legend: true, scheme: "greys"},
                        x: {domain: d3.range(0, 6), ticks: new Set(oneLADData.map(d => d[sef]))},
                        marks: [
                            // Plot.cell(oneLADData, {x: sef}),
                            Plot.cell(oneLADData,
                                Plot.groupX({fill: "count"}, {x: sef, stroke: "black"})
                            ),
                            Plot.cell([Math.floor(d3.mean(totalCBAllZones.map(d => d[sef])))],
                                {x: d => d, stroke: "red", fill: null, strokeWidth: 2}
                            )
                        ]
                    })
                } else {
                    plot = Plot.plot({
                        height: height / 3,
                        width: 500 * 2,
                        ...MARGINS,
                        // y: {grid: true, label: "mean value (£)"},
                        style: {fontSize: "18px"},
                        color: {legend: true},
                        marks: [
                            Plot.tickX(oneLADData, {
                                x: sef,
                                tip: true
                            }),
                            //  Median and Mean from ALL datazones
                            Plot.tickX(
                                [d3.mean(oneLADData.map(d => d[sef]))],
                                {stroke: "blue", strokeWidth: 2}
                            ),
                            Plot.tickX(
                                [d3.mean(totalCBAllZones.map(d => d[sef]))],
                                {stroke: "red", strokeWidth: 2}
                            ),
                        ]
                    })
                }

                SEFPlotLAD[sef]?.append(plot)


            } else {
                if (SEF_CATEGORICAL.includes(sef)) {

                    // const counts = Array.from(
                    //   d3.rollup(
                    //     totalCBAllZones,
                    //     v => v.length,
                    //     d => d.fx,        // facet
                    //     d => d.isPageLAD  // category
                    //   ),
                    //   ([fx, ladMap]) =>
                    //     Array.from(ladMap, ([isPageLAD, count]) => ({ fx, isPageLAD, count }))
                    // ).flat();
                    //
                    // // Step 3: Sum by isPageLAD
                    // const totalByLAD = Array.from(
                    //   d3.rollup(counts, v => d3.sum(v, d => d.count), d => d.isPageLAD)
                    // );
                    //
                    // // Convert to lookup map
                    // const totalMap = new Map(totalByLAD);


                    // console.log(999, sef)
                    // console.log(new Set(totalCBAllZones.map(d => d[sef])))
                    // TODO: use only totalCBAllZones and set a variable to split between average and current LAD
                    plot = Plot.plot({
                        height: height / 1.2,
                        ...MARGINS,
                        marginLeft: 100,
                        marginTop: 40,
                        marginBottom: sef === "Typology" ? 100 : 60,
                        // x: {label: SEF_SCALE(sef)},
                        x: {
                            grid: true,
                            padding: 0.6,
                            label: SEF_SCALE(sef),
                            tickFormat: d => SEF_LEVEL_LABELS[sef]?.[d] ?? d,
                            tickRotate: sef === "Typology" ? -20 : 0
                        },
                        style: {fontSize: "18px"},
                        color: {legend: true},
                        marks: [
                            // Plot.barY(totalCBAllZones, Plot.normalizeY(Plot.groupX({y: "count"}, {
                            //     x: "isPageLAD",
                            //     fx: sef,
                            //     fill: "isPageLAD"
                            // }))),
                            Plot.barY(totalCBAllZones, Plot.groupX({y: "proportion"}, {
                                x: sef,
                                dx: 12,
                                fill: AVERAGE_COLOR
                            })),
                            Plot.barY(oneLADData, Plot.groupX({y: "proportion"}, {
                                x: sef,
                                dx: -12
                            }))
                        ]
                    })
                } else {

                    plot = Plot.plot({
                        height: height / 1.2,
                        ...MARGINS,
                        // y: {label: "Datazones Frequency"},
                        x: {label: SEF_SCALE(sef)},
                        style: {fontSize: "18px"},
                        marks: [
                            Plot.areaY(oneLADData, Plot.binX({
                                y: (a, bin) => {
                                    return a.length / oneLADData.length / (bin.x2 - bin.x1);
                                }
                            }, {
                                //x: sef,
                                x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef)
                                    ? d[sef] * 100
                                    : d[sef]),
                                tip: true,
                                fill: AVERAGE_COLOR,
                                stroke: AVERAGE_COLOR,
                                fillOpacity: 0.2,
                                strokeWidth: 3
                            })),
                            Plot.areaY(totalCBAllZones, Plot.binX({
                                y: (a, bin) => {
                                    return a.length / totalCBAllZones.length / (bin.x2 - bin.x1);
                                }
                            }, {
                                //x: sef,
                                x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef)
                                    ? d[sef] * 100
                                    : d[sef]),
                                tip: true,
                                fill: "black",
                                stroke: "black",
                                fillOpacity: 0.2,
                                strokeWidth: 3
                            })),
                        ]
                    })
                }
                SEFPlotFullDistrib[sef]?.append(plotFullDistrib);
                SEFPlotLAD[sef]?.append(plot)
            }

            // Using the domain of all data skew too much th plots
            // let domain = d3.extent(oneLADData.map(d => d["total"]));
            // domain[1] = domain[1] * 2.8;
            // domain[0] = -5;

            let values = totalCBAllZones.map(d => d["total"]);
            let domain = d3.extent(values);
            values.sort();
            var len = values.length;
            var index = Math.floor(len * 1) - 1;
            let quantile = values[index];
            domain[1] = quantile + 2;
            domain[0] = -5;


            let cbplot;
            if (SEF_CATEGORICAL.includes(sef)) {
                cbplot = Plot.plot({
                    height: height / 1.2,
                    ...MARGINS,
                    marginBottom: sef === "Typology" ? 100 : 60,
                    marginLeft: 100,
                    // x: {label: SEF_SCALE(sef), type: "ordinal", tickFormat: d => Math.floor(d)},
                    x: {
                        label: SEF_SCALE(sef), type: "point", tickFormat: d => {
                            return SEF_LEVEL_LABELS[sef]?.[d] ?? d
                        }, tickRotate: sef === "Typology" ? -20 : 0
                    },
                    y: {domain: domain, grid: true, label: "Datazones Frequency"},
                    style: {fontSize: "18px"},
                    color: {range: ["#e6e6e6", AVERAGE_COLOR]},
                    marks: [
                        Plot.density(getRandomSubarray(totalCBAllZones, 15000), {
                            // Plot.density(oneLADData, {
                            x: d => `${d[sef]}`,
                            y: "total",
                            fill: "density",
                            // strokeWidth: 1.2,
                            // thresholds: 10
                            bandwidth: 3
                        }),
                        // Plot.boxY(totalCBAllZones, {
                        //     x: d => `${d[sef]}`,
                        //     y: "total",
                        //     // stroke: COBENEFS_SCALE2(coBenefit)[0],
                        //     fill: (d => {
                        //         console.log(33, d)
                        //         return "black"
                        //     }),
                        //     r: 0,
                        //     //strokeOpacity: 0.5,
                        //     fillOpacity:0.3
                        // }),
                        Plot.dot(oneLADData, {
                            x: d => `${d[sef]}`,
                            // x: sef,
                            y: "total",
                            fill: "black",
                            r: 2
                        }),
                        // Plot.linearRegressionY(oneLADData, { // Adds regression line and confidence interval
                        //     x: sef,
                        //     y: "total"
                        // }),
                        // Declaring the axes so they are on top of the densities
                        Plot.axisY({label: "Datazone Co-Benefit (millions £)"}),
                        // Plot.axisX({anchor: "bottom"}),
                    ]
                })

            } else {
                cbplot = Plot.plot({
                    height: height / 1.2,
                    ...MARGINS,
                    // y: {label: "Datazones Frequency"},
                    x: {label: SEF_SCALE(sef)},
                    y: {domain: domain},
                    grid: true,
                    style: {fontSize: "18px"},
                    // color: {range: ["rgb(227, 248, 255)", "lightblue"]},
                    color: {range: ["#e6e6e6", AVERAGE_COLOR]},
                    marks: [
                        Plot.density(getRandomSubarray(totalCBAllZones, 20000), {
                            // Plot.density(oneLADData, {
                            // x: sef,
                            x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef)
                                ? d[sef] * 100
                                : d[sef]),
                            y: "total",
                            fill: "density",
                            // strokeWidth: 1.2,
                            thresholds: 10
                        }),
                        Plot.dot(oneLADData, {
                            //x: sef,
                            x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef)
                                ? d[sef] * 100
                                : d[sef]),
                            y: "total",
                            fill: "black",
                            r: 2
                        }),
                        // Plot.linearRegressionY(oneLADData, { // Adds regression line and confidence interval
                        //     x: sef,
                        //     y: "total"
                        // }),
                        // Declaring the axes so they are on top of the densities
                        Plot.axisY({label: "Datazone Co-Benefit (£)"}),
                        Plot.axisX({anchor: "bottom"}),
                    ]
                })

            }


            // console.log("debug", cbplot)

            if (SEFPlotPerCB[sef]) {
                SEFPlotPerCB[sef].innerHTML = ""
            }
            SEFPlotPerCB[sef]?.append(cbplot)
        })
    }

    function renderHeatmap() {

        // May want to show sum
        heatmapPlot?.append(Plot.plot({
            ...MARGINS,
            marginLeft: 100,
            height: height,
            width: 300,
            grid: true,
            // x: {axis: "top", label: "Season"},
            // y: {label: "Episode"},
            color: {type: "linear", scheme: "greys", legend: true},
            marks: [
                Plot.cell(allCBAllLAD, Plot.group({fill: "mean"}, {
                    x: "scenario",
                    y: "co_benefit_type",
                    fill: "val",
                    stroke: "black",
                    dx: AVERAGE_DX / 2,
                    dy: -AVERAGE_DX / 2,
                    inset: 0.5
                })),
                Plot.cell(oneLADAllCbs, Plot.group({fill: "mean"}, {
                    x: "scenario",
                    y: "co_benefit_type",
                    fill: "total",
                    stroke: "black",
                    inset: 0.5
                }))
                // Plot.text(allCBAllLAD, {x: "scenario", y: "co_benefit_type", text: (d) => d.val?.toFixed(1), fill: "black", title: "title"})
            ]
        }))
    }

    function renderScenarioXCBPlot() {
        for (let scenario of SCENARIOS) {
            let plot = Plot.plot({
                height: height,
                width: 410,
                ...MARGINS,
                marginRight: 0,
                marginLeft: 100,
                // x: {type: "band"},

                marks: [
                    Plot.barX(allCBAllLAD, Plot.groupY({x: "mean"}, {
                        x: "val",
                        y: "co_benefit_type",
                        // dx: AVERAGE_DX,
                        dy: -AVERAGE_DX / 2,
                        fill: AVERAGE_COLOR,
                        tip: true
                    })),
                    Plot.barX(oneLADAllCbs, Plot.groupY({x: "mean"}, {
                        x: "total",
                        y: "co_benefit_type",
                        tip: true
                    }))
                ]
            })

            scenarioXcoBenefPLots[scenario]?.append(plot);

        }
    }

    function renderCBOverTimePlot() {
        let dataLAD = oneLADData.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], scenario: d.scenario, zone: "local"}
            })
        })
        let dataAllZones = totalCBAllZones.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], scenario: d.scenario, zone: "UK"}
            })
        })
        let data = dataLAD.concat(dataAllZones)

        let plot = Plot.plot({
            height: height,
            width: 800,
            ...MARGINS,
            marginRight: 0,
            marginLeft: 60,
            marginTop: 40,
            marginBottom: 60,
            style: {fontSize: "18px"},
            y: {label: '£billion', grid: true, labelArrow: false},
            x: {tickSize: 0, label: null, ticks: [], padding: 0.3},
            color: {range: [AVERAGE_COLOR, VIS_COLOR], legend: false},
            // color: {range: [VIS_COLOR, NATION_TO_COLOR[compareTo]]},
            marks: [
                // Plot.barX(allCBAllLAD, Plot.groupY({x: "mean"}, {
                //     x: "val",
                //     y: "co_benefit_type",
                //     // dx: AVERAGE_DX,
                //     dy: -AVERAGE_DX / 2,
                //     fill: AVERAGE_COLOR,
                //     tip: true
                // })),
                Plot.barY(data, Plot.groupX({y: "mean"}, {
                    x: "zone",
                    //dx: 30,
                    y: "value",
                    fx: "time",
                    tip: false,
                    fill: "zone",
                    //sort: {x: "x", reverse: true},
                })),
                Plot.axisFx({
                    anchor: "bottom",
                    tickFormat: d => d.replace(/^Y/, '').replace("_", "-"),
                    label: "Years"
                }),
            ]
        })
        CBOverTimePLot?.append(plot);

        // Make the bars overlay and one on top of the other depending of values
        // TODO: finish
        d3.select(CBOverTimePLot)
            .select("g[aria-label='bar']")
            .selectAll("g")
            .each(function (d, i) {
                // Translate the second <rect>
                const secondRect = d3.select(this).selectAll("rect").nodes()[0];

                // Get the current transform of the second rect, if any
                const currentTransform = d3.select(secondRect).attr("transform") || "";

                // Apply translation (e.g., move it 20 units to the right and 10 down)
                d3.select(secondRect)
                    .attr("transform", `${currentTransform} translate(-20, 0)`);


                // Select both <rect> elements within the current <g>
                let first = d3.select(this).selectAll("rect").nodes()[0].getAttribute("height")
                let second = d3.select(this).selectAll("rect").nodes()[1].getAttribute("height")

                // console.log(first, second)
                const rects = d3.select(this).selectAll("rect");

                // if (first < second) {
                // rects.each(function (d, i2) {
                //     if (i2 == 0) {
                //         // console.log(333, this)
                //         d3.select(this).raise()
                //     }
                //
                //     //Do stuff with first and last child
                // });

            });


        let plotPerScenario = Plot.plot({
            height: height,
            width: 800,
            ...MARGINS,
            paddingLeft: 200,
            marginRight: 0,
            color: {legend: true},
            marks: [
                Plot.lineY(data, Plot.groupX({y: "mean"}, {
                    x: "time",
                    y: "value",
                    tip: true,
                    stroke: "scenario"
                    // fill: "scenario",
                })),
            ]
        })
        CBOverTimePerScenarioPLot?.append(plotPerScenario);


        let dataCBs = oneLADAllCbs.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], cobenefit: d.co_benefit_type}
            })
        })

        console.log("dataCBs", dataCBs)

        let plotPerCB = Plot.plot({
            height: height,
            width: 1000,
            marginRight: 0,
            marginTop: 20,
            marginLeft: 80,
            marginBottom: 80,
            insetTop: 30,
            style: {fontSize: "20px"},
            y: {
                tickFormat: ".2f",
                label: '£billion',
                ticks: 10,
                labelArrow: false,
                title: ([d]) => `Cobenefit ${d.cobenefit}`
            },
            x: {
                label: 'Years',
                tickFormat: d => d.replace(/^Y/, '').replace("_", "-")
            },
            color: {legend: false, range: COBENEFS_RANGE, domain: COBENEFS.map(d => d.id)},
            marks: [
                Plot.areaY(dataCBs, Plot.groupX({y: "mean"},
                    {
                        x: "time",
                        y: "value",
                        fill: "cobenefit",
                        curve: "basis",
                        order: [
                            "Road safety",
                            "Congestion",
                            "Air quality",
                            "Noise",
                            "Excess cold",
                            "Excess heat",
                            "Dampness",
                            "Road repairs",
                            "Physical activity",
                            "Diet change",
                            "Hassle costs"],
                        tip: {
                            format: {
                                y: (d) => `${(+d).toFixed(3)}`,
                                x: (d) => `${d.replace(/^Y/, '').replace("_", "-")}`,
                                fill: (d) => `${d}`,
                            }
                        }
                    })),
                Plot.ruleY([0], {strokeWidth: 2, stroke: '#333333', opacity: 0.5, strokeLinecap: 'round'}),
            ]
        })


        CBOverTimePerCBPLot?.append(plotPerCB);

    }

    function removeChart(plotDiv) {
        // Select the figure element within the div
        const figure = plotDiv.querySelector('figure');

        // Remove the figure element if it exists
        if (figure) {
            figure.remove();
        }

        // Sometimes it's not a figure markup but a svg?
        const svg = plotDiv.querySelector('svg');
        if (svg) {
            svg.remove();
        }
    }


    $: {
        // remove old chart, if any
        if (plotDist) {
            removeChart(plotDist)
        }

        if (plotPerCb) {
            removeChart(plotPerCb)
        } // remove old chart, if any
        if (CBOverTimePLot) removeChart(CBOverTimePLot) // remove old chart, if any
        if (CBOverTimePerScenarioPLot) removeChart(CBOverTimePerScenarioPLot)
        if (CBOverTimePerCBPLot) removeChart(CBOverTimePerCBPLot)

        //ugly hack for reactivity
        if (chartType) {
        }

        if (dataLoaded && allCBAllLADSUM && totalCBAllLAD && totalCBAllZones) {
            renderPlot();
            renderPerCobenefPlot();
            renderPerCBPerLSOA();
            renderCBOverTimePlot();
        }
    }

    $: {
        Object.values(SEFPlotLAD).forEach(sefPlot => {
            if (sefPlot) removeChart(sefPlot)
        })

        Object.values(SEFPlotFullDistrib).forEach(sefPlot => {
            if (sefPlot) removeChart(sefPlot)
        })

        Object.values(SEFPlotPerCB).forEach(sefPlot => {
            if (sefPlot) removeChart(sefPlot)
        })

        if (dataLoaded) {
            renderSEFPlot();
        }
    }

    $: {
        heatmapPlot?.firstChild?.remove();

        Object.values(scenarioXcoBenefPLots).forEach(plot => {
            // plot?.firstChild?.remove();
            if (plot) removeChart(plot)
        })

        if (dataLoaded) {
            renderHeatmap();
            renderScenarioXCBPlot();
        }
    }

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

    function onChange(event) {
        chartType = event.currentTarget.value;
    }

    async function onChangeComparison(event) {
        compareTo = event.currentTarget.value;

        allCBAllLADSUM = await getTableData(getSUMCBGroupedByLADAndCB("total", compareTo));
        totalCBAllLAD = await getTableData(getSUMCBGroupedByLAD([], compareTo));

        totalCBAllZones = await getTableData(getTotalCBAllDatazones(compareTo));

        posthog.capture('clicked nation filter', {
            nation: event.currentTarget.value
        })
    }

    function exportData() {
        let data = allCBsAllZones.filter(d => d.LAD == LAD);

        //data.push({co_benefit_type: "Total", val: data.reduce((a, b) => a + b.val, 0)})

       data.forEach(d => {
       delete d.scenario;

       //     d["Cobenefit Value (Millions £)"] = d.val;
       //     delete d["val"]
       })

        const csv = convertToCSV(data);
        downloadCSV(csv, `cobenefits_${LADToName[LAD]}.csv`);
        downloadStaticPDF(`${base}/Scotland_co-benefits_CB7_2045.pdf`, "readme.pdf"); // <-- adjust filename/path as needed
    }

    $: if (selectedCoBenefit) {
        renderPerCBPerLSOA();
    }



</script>


<NavigationBar></NavigationBar>
<!-- <StickyNav sectionRefs={sectionRefs}></StickyNav> -->

<div class="page-container" bind:this={element}>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
          <span class="mini-header-text">
            {LADToName[LAD] ?? 'Loading…'}
              {#if dataLoaded && totalValue !== null}
            <span class="mini-header-value">(Total: £{totalValue.toLocaleString()} billion)</span>
            {/if}
              >> {formatLabel(currentSection)}</span>

            </div>
        </div>
    {/if}

    <div class="section header header-row" id="head">
        <div>
            <div class="header-bar">
                <p class="page-subtitle">Local Authority Report</p>
            </div>

            <div id="title-row">
                <h1 class="page-title"> {LADToName[LAD] ?? 'Loading…'}</h1>

            </div>

            <p class="description">Explore how this local authority will benefit from achieving Net Zero and learn about
                the characteristics of its households.</p>
            <div class="header-badges" aria-label="Page information badges">
                <Badge badge={BACKGROUND_READING_BADGE} onClick={{ href: '/methods', hint: { icon: 'info', text: 'Click for more information' } }} />
                <Badge badge={OPEN_DATA_BADGE} />
                <Badge
                    badge={RAW_DATA_AVAILABLE_BADGE}
                    onClick={{ action: exportData, hint: { icon: 'download', text: 'Click to download the data' } }}
                />
                <Badge badge={MODELLED_DATA_BADGE} />
            </div>

            <div class="radio-set">
                Compare this Local Authority District (LAD) against:
                <div class="radio-row">
                    <input type="radio" on:change={onChangeComparison} name="compare" value="UK" checked>
                    <label class="nation-label">UK</label>
                </div>
                <div class="radio-row">
                    <input type="radio" on:change={onChangeComparison} name="compare" value="England">
                    <label class="nation-label">England</label>
                </div>
                <div class="radio-row">
                    <input type="radio" on:change={onChangeComparison} name="compare" value="Wales">
                    <label class="nation-label">Wales</label>
                </div>
                <div class="radio-row">
                    <input type="radio" on:change={onChangeComparison} name="compare" value="Scotland">
                    <label class="nation-label">Scotland</label>
                </div>
                <div class="radio-row">
                    <input type="radio" on:change={onChangeComparison} name="compare" value="NI">
                    <label class="nation-label">Northern Ireland</label>
                </div>
            </div>
        </div>


        <div>
            <!--{d3.sum(totalCBAllZones.map(d => d.total))}-->
            <div class="waffle-stats-shell" aria-busy={!dataLoaded} aria-live="polite">
                <div class="waffle-stats">
                    <div class="waffle-stat">
                        <div class="waffle-value">
                            {#if dataLoaded && totalValue !== null}
                                {@html makeLADBarSVG(totalValue, totalValueMax ?? 0, VIS_COLOR)}
                            {/if}
                            <span class="waffle-big">
                                {dataLoaded && totalValue !== null ? `£${totalValue.toLocaleString()}` : "—"}
                            </span>
                            <span class="small">billion</span>
                        </div>

                        <div class="waffle-value">
                            {#if dataLoaded && totalValueMean !== null}
                                {@html makeLADBarSVG(totalValueMean, totalValueMax ?? 0, AVERAGE_COLOR)}
                            {/if}

                            {#if dataLoaded && totalValue !== null}
                                {#if totalValue > 0}
                                    <span class="waffle-caption">Local area benefits</span>
                                {:else}
                                    <span class="waffle-caption">Local area costs</span>
                                {/if}
                            {/if}
                        </div>
                    </div>

                    <div class="waffle-stat">
                        <div class="waffle-value">
                            {#if dataLoaded && totalValuePerCapita !== null}
                                {@html makeLADBarSVG(totalValuePerCapita, totalValuePerCapitaMax ?? 0, VIS_COLOR)}
                            {/if}
                            <span class="waffle-big">
                                {dataLoaded && totalValuePerCapita !== null ? `£${totalValuePerCapita.toLocaleString()}` : "—"}
                            </span>
                            <span class="small"></span>
                        </div>

                        <div class="waffle-value">
                            {#if dataLoaded && totalValuePerCapitaMean !== null}
                                {@html makeLADBarSVG(totalValuePerCapitaMean, totalValuePerCapitaMax ?? 0, AVERAGE_COLOR)}
                            {/if}

                            {#if dataLoaded && totalValue !== null}
                                {#if totalValue > 0}
                                    <span class="waffle-caption">Per capita benefits</span>
                                {:else}
                                    <span class="waffle-caption">Per capita costs</span>
                                {/if}
                            {/if}
                        </div>

                        {#if dataLoaded}
                            <div class="waffle-caption">
                                <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                            </div>
                        {/if}
                    </div>
                </div>
                {#if !dataLoaded}
                    <div class="waffle-stats-loading" aria-hidden="true">
                        <ChartSkeleton height={140} radius={12}/>
                    </div>
                {/if}
            </div>


        </div>

    </div>

    <div class="section" id="overview">
        <div class="section-header">
            <p class="section-subtitle">Overview</p>
            <h2 class="section-title">What co-benefits would this area receive?</h2>
            <p class="description">We model 11 types of co-benefits, based on the Climate Change Committee’s
                Seventh Carbon Budget, from 2025 to 2050 at the data zone level across the UK.</p>
        </div>

        <div id="vis-block">
            <!--            <div class="component column" bind:clientHeight={height}>-->
            <!--                <h3 class="component-title">Total Co-benefits Values Across Five Pathways (vs. UK Average)</h3>-->
            <!--                <p class="description">Aggregated values from 2025-2050 in {LADToName[LAD]} verus average value of benefits received across all local authorities in UK.</p>-->

            <!--                <div class="radio-set">-->
            <!--                    <input type="radio" on:change={onChange} name="visType" value="barchart" checked>-->
            <!--                    <label for="html">Barchart</label><br>-->
            <!--                    <input type="radio" on:change={onChange} name="visType" value="boxplot">-->
            <!--                    <label for="css">Boxplot</label><br>-->
            <!--                    <input type="radio" on:change={onChange} name="visType" value="distribution">-->
            <!--                    <label for="javascript">Distribution</label>-->
            <!--                </div>-->

            <!--                <div class="plot" bind:this={plot}>-->
            <!--&lt;!&ndash;                    <div class="badge-container">&ndash;&gt;-->
            <!--&lt;!&ndash;                        <img class="badge" src={mouseOverBadge} />&ndash;&gt;-->
            <!--&lt;!&ndash;                        <img class="badge" src={aggregationBadge} />&ndash;&gt;-->
            <!--&lt;!&ndash;                    </div>&ndash;&gt;-->
            <!--                </div>-->
            <!--            </div>-->

            <div class="component column">

                <h3 class="component-title">Distribution of the cobenefit per
                    <span class="tooltip-term">
                                data zone
                                <span class="tooltip-txt">
                                Data zones are standard statitical geographies in UK that  comprise between 400 and 1200 households.
                                </span>
                        </span>
                    compared to <span
                            class="nation-label">{compareTo}</span> Average)</h3>
                <p class="description">Co-benefit values for {LADToName[LAD]} compared to average value of benefits
                    received across all local
                    authorities in <span class="nation-label">{compareTo}</span> (grey).</p>
                <br>
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${DIST_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={DIST_PLOT_HEIGHT}/>
                    {:else}
                        {@html renderDistributionPlot(totalCBAllZones, oneLADData)}
                    {/if}
                    <div class="chart-badge-bottom-right" aria-label="Chart information badges">
                        <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                    </div>
                </div>

                <h3 class="component-title">11 types of co-benefit values (vs. <span
                        class="nation-label">{compareTo}</span> Average)</h3>
                <p class="description">Co-benefit values for {LADToName[LAD]} compared to average value of benefits
                    received across all local
                    authorities in <span class="nation-label">{compareTo}</span> (grey).</p>
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${TALL_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={TALL_PLOT_HEIGHT}/>
                    {/if}
                    <div class="plot {dataLoaded ? '' : 'chart-hidden'}" bind:this={plotPerCb}></div>
                    <div class="chart-badge-bottom-right" aria-label="Chart information badges">
                        <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                    </div>
                </div>
            </div>

            <div class="component column">
                <h3 class="component-title">Where is {LADToName[LAD]}?</h3>
                <p class="description">{LADToName[LAD]} has been highlighted in dark grey on this UK map.</p>
                <div class="map-shell">
                    <div id="map" bind:this={mapDiv}>
                        <!--                    <div class="badge-container">-->
                        <!--                        <img class="badge" src={zoomBadge} />-->
                        <!--                    </div>-->
                    </div>
                </div>
                <div class="chart-badges map-info-badges" aria-label="Map information badges">
                    <Badge badge={INTERACTIVE_BADGE} variant="filled" />
                </div>
            </div>
        </div>




    </div>


    <!--    <div class="section">-->
    <!--        <div class="section-header">-->
    <!--            <p class="section-subtitle">Breakdown</p>-->
    <!--            <h2 class="section-title">How would the co-benefit results vary if we take different pathways?</h2>-->
    <!--            <p class="description">We break down the modeled co-benefit values in different pathways towards achieving Net Zero. All Results are compared with the average value across all local authorities in UK.</p>-->
    <!--        </div>-->

    <!--        <div class="row">-->
    <!--            <div class="component">-->
    <!--                <h3 class="component-title">Five Pathways and their 11 Co-benefits</h3>-->
    <!--                <p class="description">Scroll for zooming in and out.</p>-->
    <!--                <div class="plot" bind:this={heatmapPlot}></div>-->
    <!--            </div>-->

    <!--            {#each SCENARIOS as scenario}-->
    <!--                <div class="component">-->
    <!--                    <h3 class="component-title"> Pathway: {scenario}</h3>-->
    <!--                    <p class="description">Please refer to CCC website on definitions of {scenario}.</p>-->
    <!--                    <div class="plot" bind:this={scenarioXcoBenefPLots[scenario]}>-->
    <!--&lt;!&ndash;                        <div class="badge-container">&ndash;&gt;-->
    <!--&lt;!&ndash;                            <img class="badge" src={roundingBadge} />&ndash;&gt;-->
    <!--&lt;!&ndash;                            <img class="badge" src={aggregationBadge} />&ndash;&gt;-->
    <!--&lt;!&ndash;                        </div>&ndash;&gt;-->
    <!--                    </div>-->
    <!--                </div>  -->
    <!--            {/each}-->
    <!--        </div>-->
    <!--    </div>-->

    <div class="section" id="temporal">
        <div class="section-header">
            <p class="section-subtitle">Temporal Trends</p>
            <h2 class="section-title">How will co-benefits change over time?</h2>
            <p class="description">Detailed breakdown of temporal trends for total average co-benefits and types of
                co-benefits.</p>
        </div>
        <div id="vis-block">
            <div id="main-block" class="component column">
                <div>
                    <h3 class="component-title">Total co-benefit distribution from 2025-2049 (vs. <span
                            class="nation-label">{compareTo}</span> Average)</h3>
                    <p class="description" style="margin-bottom:5px">Aggregated values from 2025-2049
                        in {LADToName[LAD]} compared to average value of benefits received across all local authorities
                        in <span class="nation-label">{compareTo}</span>.</p>

                    <!-- Legend -->
                    <div class="legend-box">
                        <strong style="margin-bottom: 0.5rem;">Legend:</strong> <br/>
                        <ul class="legend-list">
                            <li><span class="legend-color" style="background-color: {VIS_COLOR}"></span>
                                {LADToName[LAD]}</li>
                            <li><span class="legend-color" style="background-color: {AVERAGE_COLOR}"></span>
                                <span class="nation-label">{compareTo}</span></li>
                        </ul>
                    </div>
                </div>

                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${TALL_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={TALL_PLOT_HEIGHT}/>
                    {/if}
                    <div class="plot side {dataLoaded ? '' : 'chart-hidden'}" bind:this={CBOverTimePLot}></div>
                    <div class="chart-badge-bottom-right" aria-label="Chart information badges">
                        <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                    </div>
                </div>


                <!-- <div class="row"> -->
                <!-- <div class="plot" bind:this={CBOverTimePLot}> -->
                <!--                    <div class="badge-container">-->
                <!--                            <img class="badge" src={predictionsBadge} />-->
                <!--                        </div>-->
                <!-- </div> -->
                <!-- </div> -->
            </div>
            <div id="main-block" class="component column">
                <div>
                    <h3 class="component-title">Co-benefit gain/loss for {LADToName[LAD]} over 5 year intervals</h3>
                    <p class="description" style="margin-bottom:5px">Total gains and losses are shown at five-year
                        intervals for each co-benefit. The curve between points is smoothed to show the general
                        trends.</p>

                    <!-- Legend -->
                    <div id="main-legend" class="legend-box">
                    <strong>Co-benefits:</strong><br>Expand for detailed explanation
                    <div style="height: 0.8em;"></div>
                    <div class="legend-items-grid">
                        {#each COBENEFS as CB}
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
                    </div>

                </div>
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${TALL_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={TALL_PLOT_HEIGHT}/>
                    {/if}
                    <div class="plot side {dataLoaded ? '' : 'chart-hidden'}" bind:this={CBOverTimePerCBPLot}></div>
                    <div class="chart-badge-bottom-right" aria-label="Warnings">
                        <Badge badge={INVISIBLE_SMALL_AREAS_BADGE} variant="outlined" />
                        <Badge badge={SMOOTHED_DATA_BADGE} variant="outlined" />
                    </div>
                </div>
            </div>
        </div>

    </div>
<div class="section" id="breakdown">
            <div id="vis-block">
            <div class="chart-badges map-info-badges bottom-right" aria-label="Interaction badges">
                <Badge badge={CAN_FILTER_BADGE} variant="filled" />
                <Badge badge={INTERACTIVE_BADGE} variant="filled" />
            </div>
            <div id="main-block">
                <h3 class="section-title" style="align">What co-benefits would the LSOAs recieve?</h3>
                <p class="description">The distribution plot below shows the predicted spread of benefits recieved or costs incurred by the LSOAs across {LADToName[LAD]}.
                    Select a co-benefit from the dropdown menu and explore the position of different datazones by using the search box.</p>
                <div>
                    <div class="controls-container">
                    <div class="control-group">
                    <label for="coBenefitSelect">Select Co-Benefit Type:</label>
                    <select id="coBenefitSelect" bind:value={selectedCoBenefit}>
                        {#each allCoBenefitTypes as type}
                            <option value={type}>{type}</option>
                        {/each}
                    </select>
                    </div>
                    <div class="control-group search-container">
                    <label>
                        Search LSOA:
                        <input
                                type="text"
                                placeholder="Enter LSOA"
                                bind:value={searchInput}
                                autocomplete="off"
                        />
                    </label>

                    {#if searchResults.length > 0}
                        <ul class="search-results">
                            {#each searchResults as result}
                                <li on:click={() => selectLSOA(result)}>
                                    {result.name}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
                </div>
                </div>
                <br>
                <div bind:this={plotPerCBPerLSOA}></div>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; padding-top: 3rem;">
                <h3 class="component-title">LSOA Map</h3>

                <p class="description">This map shows the total co-benefit values (£ millions) for each LSOA of {LADToName[LAD]}</p>
                <div class="chart-shell" style={!dataLoaded ? 'height: 520px;' : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={520}/>
                    {/if}
                    <div id="map-lsoa" style="height: 520px;" class="{dataLoaded ? '' : 'chart-hidden'}" bind:this={mapLSOADiv}></div>
                </div>
            </div>


        </div>
        </div>

    <div class="section" id="households">
        <div class="section-header">
            <p class="section-subtitle">Households</p>
            <h2 class="section-title">{LADToName[LAD]} social-economic factors</h2>
            <p class="description">We describe the distribution of household economic factors aggregated on the data
                zone level and the different level of co-benefits received by those data zones.</p>
        </div>

        <div id="se-block" class="component" style="margin-left: 1rem;">
            <div id="se-title">
                <h3 class="component-title">Comparing the Socio-Economic factors distributions of {LADToName[LAD]}
                    and {compareTo}, and their correlation with co-benefits.</h3>
                <br>


                <!-- Legend -->
                <div id="se-legend" class="legend-box">
                    <strong style="margin-bottom: 1rem;">Legend:</strong> <br/>
                    <ul class="legend-list">
                        <li><span class="legend-color" style="background-color: {VIS_COLOR}"></span>
                            {LADToName[LAD]}</li>
                        <li><span class="legend-color" style="background-color: {AVERAGE_COLOR}"></span>
                            {compareTo}</li>
                    </ul>
                </div>

                <!-- Interpretation  -->
                <div id="se-legend" class="legend-box">
                    <strong style="margin-bottom: 1rem;">Interpreting the charts:</strong> <br/>
                    <p><strong>Barchart:</strong> Each bar represents the normalized frequency of datazones linked to a
                        given social economic factor value. </p>
                    <p><strong>Scatterplot:</strong> Each dot represents a datazone inside {LADToName[LAD]}. The cloud
                        shows the distribution for {compareTo}. </p>
                </div>

                <div class="chart-badges disclaimer-badges" aria-label="Disclaimers">
                    <Badge badge={CORRELATION_NOT_CAUSATION_BADGE} variant="outlined" />
                    <Badge badge={DISCRETE_SCALES_BADGE} variant="outlined" />
                </div>
            </div>


            <div id="multiple-comp">
                {#each SE_FACTORS as sef}
                    <div class="household-column">
                        <h2 class="column-chart-title">
                            <a class="link" target="_blank" href="{base}/sef?sef={sef.id}">{sef.label}</a>
                        </h2>
                        <p class="column-chart-caption">{sef.def}</p>
                        <div class="row">
                            {#if isSEFAggregated}
                                <div class="component column">
                                    <div class="plot" bind:this={SEFPlotLAD[sef.id]}>
                                    </div>
                                </div>
                            {:else}
                                <div class="component column">
                                    <h3 class="component-title">
                                            <span class="tooltip-term">
                                                Data zones
                                                <span class="tooltip-txt">
                                                Data zones are standard statitical geographies in UK that  comprise between 400 and 1200 households.
                                                </span>
                                            </span>
                                        distribution (vs. <span
                                            class="nation-label">{compareTo}</span> average)</h3>
                                    <p class="description short">The histogram shows the number of data zones
                                        distributed
                                        across
                                        different household social economic factors.</p>
                                    <div class="sef-card-with-badge">
                                        <div class="plot" bind:this={SEFPlotLAD[sef.id]}></div>
                                        <div class="sef-badge-bottom-right" aria-label="Chart information badges">
                                            {#if SEF_CATEGORICAL.includes(sef.id)}
                                                <Badge badge={SEF_BARCHART_BADGE} variant="outlined" type="mini" />
                                            {:else}
                                                <Badge badge={makeSEFChartBadge('distribution', areaNameForBadges, compareTo)} variant="outlined" type="mini" />
                                            {/if}
                                        </div>
                                    </div>
                                </div>


                                <div class="component column">
                                    <div>
                                        <h3 class="component-title">Co-benefits received by data zones
                                            across {sef.label}
                                            values</h3>
                                        <p class="description short">Density plot refers to UK distribution while the
                                            scattered points refer to data zones in {LADToName[LAD]}.</p>
                                        <!--                                    <div class="plot" bind:this={SEFPlotFullDistrib[sef]}>-->
                                        <!--                                    </div>-->
                                    </div>

                                    <div>
                                        <div class="sef-card-with-badge">
                                            <div class="plot" bind:this={SEFPlotPerCB[sef.id]}></div>
                                            <div class="sef-badge-bottom-right" aria-label="Chart information badges">
                                                <Badge badge={CORRELATION_NOT_CAUSATION_BADGE} variant="outlined" type="mini" />
                                                <Badge badge={makeSEFChartBadge('scatterplot', areaNameForBadges, compareTo)} variant="outlined" type="mini" />
                                            </div>
                                        </div>
                                        <!-- chart badges intentionally disabled on this page -->
                                    </div>
                                </div>
                            {/if}

                        </div>
                    </div>
                {/each}
            </div>
        </div>

    </div>

</div>
<Footer></Footer>

<style>
    .chart-shell {
        position: relative;
        width: 100%;
    }

    .chart-hidden {
        opacity: 0;
    }

    .chart-badges {
        display: flex;
        justify-content: flex-end;
        gap: 0px;
        margin-top: 6px;
        pointer-events: auto;
        opacity: 0.98;
    }

    .disclaimer-badges {
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 8px;
    }

    .chart-badge-bottom-right {
        position: absolute;
        right: 12px;
        bottom: 12px;
        z-index: 3;
        pointer-events: auto;
        opacity: 0.98;
        display: flex;
        gap: 6px;
    }

    .map-info-badges {
        gap: 3px;
    }

    .chart-badges.bottom-right {
        position: absolute;
        right: 12px;
        bottom: 12px;
        margin-top: 0;
        opacity: 0.98;
        z-index: 2000;
    }

    .header-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        margin-bottom: 2px;
    }

    /* Keep radio circles vertically aligned with labels (some fonts/baselines can drift). */
    .radio-set {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
    }

    .radio-row {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .radio-row input[type="radio"] {
        margin: 0;
    }

    /* Reserve space so bottom-right badges don't overlap axis labels */
    .chart-shell.with-bottom-badges {
        padding-bottom: 55px;
    }

    .sef-card-with-badge {
        position: relative;
        padding-bottom: 36px;
    }

    .sef-badge-bottom-right {
        position: absolute;
        right: -3px;
        bottom: 0px;
        z-index: 3;
        pointer-events: auto;
        display: flex;
        gap: 0px;
    }

    .header-row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        background-color: #f9f9f9;
        padding: 1% 6%;
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
        position: relative;
    }

    #main-block {
        display: flex;
        /* width: 100%; */
        flex-direction: column;
        /* min-height: 70vh; */
    }

    #title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #main-title {
        width: 30vw;
        margin-left: 1rem;
        margin-right: 2rem;
        position: sticky;
        top: 120px;
        align-self: flex-start;
        height: fit-content;
    }

    #side-title {
        width: 30vw;
        margin-left: 1rem;
        margin-right: 2rem;
        align-self: flex-start;
        /* height: fit-content; */
    }


    label {
        font-weight: bold;
    }


    #map {
        width: 100%;

        /*TODO: height is given by this currently but better to change at some point*/
        height: 750px;
        /*flex: 1; !* take the remaining height *!*/
    }

    .map-shell {
        position: relative;
        width: 100%;
    }


    #map-lsoa {
        flex: 1;
        /*width: 100%;*/
        /*height: 100%;*/
    }

    #multiple-comp {
        /* grid-column: span 2 / span 2; */
        width: 100%;
        padding: 1rem 0;
    }

    .side {
        margin-top: 10px;
    }

    .component .column {
        /* flex:50% */
        background-color: #fff;
    }

    .household-column {
        /* width: 100%; */
        padding: 0;
        margin-bottom: 30px;
    }

    .column-chart-title {
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
        margin-bottom: 5px;
        text-align: left;
    }

    .column-chart-caption {
        font-size: 0.9rem;
        line-height: 1.1rem;
        color: #555;
        margin: 0 0 5px 0;
        text-align: left;
    }


    .nation-label {
        /*color: #90bcca;*/
        color: var(--compareColor);
    }

    .disclaimer-box {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background-color: #f9f9f9;
        border-left: 4px solid #ccc;
        font-size: 0.9rem;
        color: #555;
    }

    .legend-box {
        margin-bottom: 2rem;
        padding: 0.75rem;
        background-color: #f0f0f0;
        border-radius: 8px;
        font-size: 0.9rem;
    }

    .legend-list {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }

    .legend-list li {
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
    }

    .horizontal-legend-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .legend-color {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        border-radius: 2px;
    }

    .legend-icon {
        width: 0.2rem;
        height: 0.2rem;
    }

    #se-block {
        display: flex;
        /* width: 100%; */
        flex-direction: row;
        min-height: 100vh;
    }

    #se-title {
        width: 35vw;
        margin-left: 1rem;
        margin-right: 2rem;
        position: sticky;
        top: 120px;
        align-self: flex-start;
        height: fit-content;
    }


    .waffle-stat {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    .waffle-stats-shell {
        position: relative;
        min-height: 140px;
    }

    .waffle-stats-loading {
        position: absolute;
        inset: 0px;
        border-radius: 12px;
        transform: translateX(-100px);
        pointer-events: none;
    }

    .waffle-value {
        display: flex;
        align-items: baseline;
        gap: 0.3rem;
        /*width: 300px;*/
    }

    .waffle-big {
        font-size: 1.5rem;
        font-weight: medium;
    }

    .small {
        font-size: 0.9rem;
        color: black;
    }

    .waffle-caption {
        margin-top: 0.2rem;
        font-size: 0.85rem;
        color: black;
        /*float: right;*/
        margin-left: auto;
        /*margin-right: 10%;*/
    }

    .header-bar {
        display: flex;
        align-items: center;
        justify-content: gap;
        gap: 1rem;
    }

    select,
        input[type="text"] {
        width: 100%;
        padding: 4px 8px;
        font-size: 16px;
        font-family: inherit;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        }

        select:focus,
        input[type="text"]:focus {
        border-color: #007acc;
        outline: none;
        }

    .search-container {
        position: relative;
        }

        .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ccc;
        border-top: none;
        margin: 0;
        padding: 0;
        list-style: none;
        z-index: 1000;
        border-radius: 0 0 4px 4px;
        }

    .search-results li {
        padding: 4px 8px;
        cursor: pointer;
    }

    .search-results li:hover {
        background-color: #f0f0f0;
    }

        .legend-items-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0rem 1.5rem;
}

    .controls-container {
        display: flex;
        gap: 40px;
        align-items: flex-start;
        flex-wrap: wrap;
        }

        .control-group {
        display: flex;
        flex-direction: column;
        font-family: inherit;
        font-size: 16px;
        width: 300px;
        }

        .control-group label {
        margin-bottom: 0px;
        font-weight: 600;
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
</style>
