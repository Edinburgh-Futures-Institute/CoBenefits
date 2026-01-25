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
        getIconFromCobenef, COBENEFS_SCALE2,
        SE_FACTORS, SEF_LEVEL_LABELS, type Nation,
        convertToCSV,
        downloadCSV
    } from "../../globals";
    import {getRandomSubarray} from "$lib/utils";

    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import ChartSkeleton from "$lib/components/ChartSkeleton.svelte";
    import Badge from '$lib/badge/Badge.svelte';
    import {
        BACKGROUND_READING_BADGE,
        COMPARISON_AVERAGE_BADGE,
        INTERACTIVE_BADGE,
        INVISIBLE_SMALL_AREAS_BADGE,
        MODELLED_DATA_BADGE,
        OPEN_DATA_BADGE,
        RAW_DATA_AVAILABLE_BADGE,
        SMOOTHED_DATA_BADGE
    } from '$lib/badge/badges';
    import {
        getAllCBAllDatazones, getAllCBForOneLAD, getAllCBForOneNation,
        getAverageCBGroupedByLAD,
        getSUMCBGroupedByLAD, getSUMCBGroupedByLADAndCB,
        getTableData, getTopSelectedLADs,
        getTotalCBAllDatazones, getTotalCBForOneLAD, getTotalCBForOneNation
    } from "$lib/duckdb";
    import Footer from "$lib/components/Footer.svelte";

    let sectionRefs = {
        head: null,
        overview: null,
        temporal: null,
        households: null
    };

    let element: HTMLElement
    let plotDist: HTMLElement
    let plotPerCb: HTMLElement
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

    let height = 400;

    // Data from load function
    export let data;

    const NATION = data.nation;
    let compareTo: "UK" | Nation = "UK"

    let totalCBAllZones;
    let allCBsAllZones;
    let totalCBAllLAD;

    let allCBAllLAD;

    let allCBAllLADSUM;

    let oneNationData;
    let oneNationAllCbs;

    let totalValue: number;
    let totalValuePerCapita: number;
    let totalValueMax: number;
    let totalValuePerCapitaMax: number;
    let totalValueMean: number;
    let totalValuePerCapitaMean: number;

    let dataLoaded = false;

    const DIST_PLOT_HEIGHT = Math.round(height / 1.6);
    const PER_CB_PLOT_HEIGHT = Math.round(height / 1.0);
    const TEMP_PLOT_HEIGHT = Math.round(height * 1.5);

    async function loadData() {
        totalCBAllZones = await getTableData(getTotalCBAllDatazones());
        allCBsAllZones = await getTableData(getAllCBAllDatazones());
        console.log("allCBsAllZones", allCBsAllZones)

        totalCBAllZones.forEach(datazone => {
            datazone.isPageLAD = (datazone.Nation == NATION) ? true : false
        })

        totalCBAllLAD = await getTableData(getSUMCBGroupedByLAD([]));
        console.log("totalCBAllLAD", totalCBAllLAD)
        allCBAllLAD = await getTableData(getAverageCBGroupedByLAD(COBENEFS.map(d => d.id)));

        allCBAllLADSUM = await getTableData(getSUMCBGroupedByLADAndCB());
        console.log("allCBAllLADSUM", allCBAllLADSUM)

        oneNationData = await getTableData(getTotalCBForOneNation(NATION));
        oneNationAllCbs = await getTableData(getAllCBForOneNation(NATION));
        console.log("oneNationAllCbs", oneNationAllCbs)

        totalValue = (d3.sum(oneNationData, d => d.total) / 1000).toFixed(3);
        totalValueMax = d3.max(totalCBAllLAD, d => d.val) / 1000;

        // This is an approximation
        totalValuePerCapita = (d3.mean(oneNationData, d => d.totalPerCapita) * 1000000).toFixed(1);

        totalValuePerCapitaMax = await getTableData(getTopSelectedLADs({limit: 1, sortBy: "per_capita"}));
        totalValuePerCapitaMax = totalValuePerCapitaMax[0].value_per_capita;

        dataLoaded = true;
    }

    $: {
        if (totalCBAllLAD) {
            totalValueMean = d3.mean(totalCBAllLAD.map(d => d.val)) / 1000;
            totalValuePerCapitaMean = d3.mean(totalCBAllLAD.map(d => d.value_per_capita)) * 100000;
        }
    }

    let scrolledPastHeader = false;
    let currentSection = '';
    const sectionIds = ['overview', 'temporal', 'households'];

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
                })};

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
            households: 'Household benefits'
        };
        return labels[id] || '';
    }

    let map: MapUK;
    let mapDiv: HTMLElement;

    onMount(() => {
        // Start loading in the background (non-blocking).
        void loadData().then(() => {
            if (mapDiv && oneNationData) {
                map = new MapUK(oneNationData, "LSOA", mapDiv, "total", false, "Lookup_Value", false);
                map.initMap();
            }
        });

        window.addEventListener('scroll', handleScroll); // header scroll listener

        handleScroll(); // initialize
        return () => window.removeEventListener('scroll', handleScroll);
    })

    onDestroy(() => {
        window.removeEventListener('scroll', handleScroll); // remove listener
    })

    function makeLADBarSVG(value, max, fill = "black") {
        const plot = Plot.plot({
            width: 80,
            height: 20,
            margin: 0,
            x: {domain: [0, max], axis: null},
            marks: [
                Plot.barX([value], {
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

        let filtered = totalCBAllZones.filter(d => d.total < 20)

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
                ]
            })
            plotDist?.append(pl);

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
                marginLeft: 80,
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
                    Plot.barY(allCBAllLADSUM, Plot.groupX({y: "sum"}, {
                        y: "val",
                        x: "co_benefit_type",
                        dx: 12,
                        fill: AVERAGE_COLOR,
                        sort: {x: "y", reverse: true},
                        tip: true,
                    })),
                    Plot.barY(oneNationAllCbs, Plot.groupX({y: "sum"}, {
                        y: "total",
                        x: "co_benefit_type",
                        dx: -12,
                        fill: d => COBENEFS_SCALE(d["co_benefit_type"]),
                        tip: true,
                        tipoffset: 10,
                        fillOpacity: 0.8
                    })),
                    Plot.axisY({label: 'Total Co-Benefit (£million)', labelAnchor: "center", labelArrow: false}),
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

            if (SEFPlotPerCB[sef]) {
                SEFPlotPerCB[sef].innerHTML = ""
            }
            SEFPlotPerCB[sef]?.append(cbplot)
        })
    }


    function renderCBOverTimePlot() {
        let dataNation = oneNationData.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], scenario: d.scenario, zone: "local"}
            })
        })
        let dataAllZones = totalCBAllZones.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], scenario: d.scenario, zone: "UK"}
            })
        })
        let data = dataNation.concat(dataAllZones)

        let plot = Plot.plot({
            height: height* 1.5,
            width: 800,
            ...MARGINS,
            marginRight: 0,
            marginLeft: 60,
            marginTop: 40,
            marginBottom: 60,
            style: {fontSize: "18px"},
            y: {label: '£Billion', grid: true, labelArrow: false},
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
                    fx: "time",
                    y: "value",
                    //fx: "time",
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



// Flatten the data for plotting
let dataCBs = oneNationAllCbs.flatMap(d => {
    return TIMES.map(t => ({
        time: t,
        value: d[t],
        cobenefit: d.co_benefit_type
    }));
});

// Area plot
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
    },
    x: {
        label: 'Years',
        tickFormat: d => d.replace(/^Y/, '').replace("_", "-")
    },
    color: {
        legend: false,
        range: COBENEFS_RANGE,
        domain: COBENEFS.map(d => d.id)
    },
    marks: [
        Plot.areaY(dataCBs, Plot.groupX({y: "mean"}, {
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
                "Hassle costs"
            ],
            tip: {
                format: {
                    y: (d) => `${(+d).toFixed(3)}`,
                    x: (d) => `${d.replace(/^Y/, '').replace("_", "-")}`,
                    fill: (d) => `${d}`,
                }
            }
        })),
        Plot.ruleY([0], {
            strokeWidth: 2,
            stroke: '#333333',
            opacity: 0.5,
            strokeLinecap: 'round'
        }),
    ]
});

// Append to container
CBOverTimePerCBPLot?.append(plotPerCB); }

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



    $: {
        // remove old chart, if any
        if (plotDist) {
            removeChart(plotDist)
        }

        if (plotPerCb) {
            removeChart(plotPerCb)
        } // remove old chart, if any
        console.log("PLOT",plotPerCb);

        if (CBOverTimePLot) removeChart(CBOverTimePLot) // remove old chart, if any
        if (CBOverTimePerScenarioPLot) removeChart(CBOverTimePerScenarioPLot)
        if (CBOverTimePerCBPLot) removeChart(CBOverTimePerCBPLot)

        //ugly hack for reactivity
        if (chartType) {
        }

        if (dataLoaded && allCBAllLADSUM && totalCBAllLAD && totalCBAllZones) {
            //renderPlot();
            renderPerCobenefPlot();
            renderCBOverTimePlot();
        }
    }

    $: {
        // Object.values(SEFPlotLAD).forEach(sefPlot => {
        //     if (sefPlot) removeChart(sefPlot)
        // })
        //
        // Object.values(SEFPlotFullDistrib).forEach(sefPlot => {
        //     if (sefPlot) removeChart(sefPlot)
        // })
        //
        // Object.values(SEFPlotPerCB).forEach(sefPlot => {
        //     if (sefPlot) removeChart(sefPlot)
        // })
        //
        // if (dataLoaded) {
        //     renderSEFPlot();
        // }
    }

    function onChange(event) {
        chartType = event.currentTarget.value;
    }

    async function onChangeComparison(event) {
        compareTo = event.currentTarget.value;
        console.log(232323333, compareTo)

        allCBAllLADSUM = await getTableData(getSUMCBGroupedByLADAndCB("total", compareTo));
        totalCBAllLAD = await getTableData(getSUMCBGroupedByLAD([], compareTo));
        totalCBAllZones = await getTableData(getTotalCBAllDatazones(compareTo));

        posthog.capture('clicked nation filter', {
        nation: compareTo
        })
    }

    function exportData() {
        if (!allCBsAllZones) return;
        const rows = allCBsAllZones.filter((d) => d.Nation === NATION);
        rows.forEach((d) => {
            delete d.scenario;
        });
        const csv = convertToCSV(rows);
        downloadCSV(csv, `cobenefits_${NATION}.csv`);
    }

</script>

<NavigationBar></NavigationBar>

<div class="page-container" bind:this={element}>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
          <span class="mini-header-text">
            {NATION}
              {#if totalValue}
            <span class="mini-header-value">(Total: £{totalValue.toLocaleString()} billion)</span>
            {/if}
              >> {formatLabel(currentSection)}</span>

            </div>
        </div>
    {/if}

    <div class="section header header-row" id="head">
        <div>
            <p class="page-subtitle">Nation Report</p>
            <h1 class="page-title"> {NATION}</h1>
            <p class="description">Explore how this nation will benefit from achieving Net Zero and learn about
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
                    Compare {NATION} against:

                    {#if NATION !== 'UK'}
                      <div class="radio-row">
                        <input type="radio" on:change={onChangeComparison} name="compare" value="UK" checked>
                        <label class="nation-label">UK</label>
                      </div>
                    {/if}

                    {#if NATION !== 'England'}
                      <div class="radio-row">
                        <input type="radio" on:change={onChangeComparison} name="compare" value="England">
                        <label class="nation-label">England</label>
                      </div>
                    {/if}

                    {#if NATION !== 'Wales'}
                      <div class="radio-row">
                        <input type="radio" on:change={onChangeComparison} name="compare" value="Wales">
                        <label class="nation-label">Wales</label>
                      </div>
                    {/if}

                    {#if NATION !== 'Scotland'}
                      <div class="radio-row">
                        <input type="radio" on:change={onChangeComparison} name="compare" value="Scotland">
                        <label class="nation-label">Scotland</label>
                      </div>
                    {/if}

                    {#if NATION !== 'NI'}
                      <div class="radio-row">
                        <input type="radio" on:change={onChangeComparison} name="compare" value="NI">
                        <label class="nation-label">Northern Ireland</label>
                      </div>
                    {/if}
                  </div>
        </div>


        <div>
            <div class="waffle-stats-shell" aria-busy={!dataLoaded} aria-live="polite">
                <div class="waffle-stats">
                    <div class="waffle-stat">
                        <div class="waffle-value">
                            {#if dataLoaded}
                                {@html makeLADBarSVG(totalValue, totalValueMax, VIS_COLOR)}
                            {/if}
                            <span class="waffle-big">
                                {dataLoaded ? `£${totalValue.toLocaleString()}` : "—"}
                            </span>
                            <span class="small">billion</span>
                        </div>

                        <div class="waffle-value">
                            {#if dataLoaded}
                                {@html makeLADBarSVG(totalValueMean, totalValueMax, AVERAGE_COLOR)}
                            {/if}

                            {#if dataLoaded}
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
                            {#if dataLoaded}
                                {@html makeLADBarSVG(totalValuePerCapita, totalValuePerCapitaMax, VIS_COLOR)}
                            {/if}
                            <span class="waffle-big">
                                {dataLoaded ? `£${totalValuePerCapita.toLocaleString()}` : "—"}
                            </span>
                            <span class="small"></span>
                        </div>

                        <div class="waffle-value">
                            {#if dataLoaded}
                                {@html makeLADBarSVG(totalValuePerCapitaMean, totalValuePerCapitaMax, AVERAGE_COLOR)}
                            {/if}

                            {#if dataLoaded}
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
                        <ChartSkeleton width="180px" height={180} radius={12}/>
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
                <p class="description">Co-benefit values for {NATION} compared to average value of benefits
                    received across all local
                    authorities in <span class="nation-label">{compareTo}</span> (grey).</p>
                <br>
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${DIST_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={DIST_PLOT_HEIGHT}/>
                    {:else}
                        {@html renderDistributionPlot(totalCBAllZones, oneNationData) }
                    {/if}
                    <div class="chart-badge-bottom-right" aria-label="Chart information badges">
                        <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                    </div>
                </div>

                <h3 class="component-title">11 types of co-benefit values (vs. <span
                        class="nation-label">{compareTo}</span> Average)</h3>
                <p class="description">Total co-benefit values for {NATION} compared to total benefits/costs
                    received across all local
                    authorities in <span class="nation-label">{compareTo}</span> (grey).</p>
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${PER_CB_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={PER_CB_PLOT_HEIGHT}/>
                    {/if}
                    <div class="plot {dataLoaded ? '' : 'chart-hidden'}" bind:this={plotPerCb}></div>
                    <div class="chart-badge-bottom-right" aria-label="Chart information badges">
                        <Badge badge={COMPARISON_AVERAGE_BADGE} variant="filled" />
                    </div>
                </div>
            </div>

            <div class="component column">
                <h3 class="component-title">Total co-benefits across {NATION}</h3>
                <p class="description">Click a region to visit the Local Authority Report Page</p>
                <div class="chart-shell" style={!dataLoaded ? 'height: 650px;' : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={650}/>
                    {/if}
                    <div id="map" class="{dataLoaded ? '' : 'chart-hidden'}" bind:this={mapDiv}></div>
                </div>
                <div class="chart-badges map-info-badges" aria-label="Map information badges">
                    <Badge badge={INTERACTIVE_BADGE} variant="filled" />
                </div>
            </div>
        </div>
    </div>


    <div class="section" id="temporal">
        <div class="section-header">
            <p class="section-subtitle">Temporal Trends</p>
            <h2 class="section-title">How will co-benefits change over time?</h2>
            <p class="description">Detailed breakdown of temporal trends for total average co-benefits and types of
                co-benefits.</p>
        </div>
        <div id="vis-block">
            <div id="main-block" class="component-left column">
                <div>
                    <h3 class="component-title">Total co-benefit distribution from 2025-2049 (vs. <span
                            class="nation-label">{compareTo}</span> Average)</h3>
                    <p class="description" style="margin-bottom:5px">Aggregated values from 2025-2049
                        in {NATION} compared to average value of benefits received across all local authorities
                        in <span class="nation-label">{compareTo}</span>.</p>

                    <!-- Legend -->
                    <div class="legend-box">
                        <strong style="margin-bottom: 0.5rem;">Legend:</strong> <br/>
                        <ul class="legend-list">
                            <li><span class="legend-color" style="background-color: {VIS_COLOR}"></span>
                                {NATION}</li>
                            <li><span class="legend-color" style="background-color: {AVERAGE_COLOR}"></span>
                                <span class="nation-label">{compareTo}</span></li>
                        </ul>
                    </div>
                </div>

                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${TEMP_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={TEMP_PLOT_HEIGHT}/>
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
            <div id="main-block" class="component-right column">
                <div>
                    <h3 class="component-title">Co-benefit gain/loss for {NATION} over 5 year intervals</h3>
                    <p class="description" style="margin-bottom:5px">Total gains and losses are shown at five-year
                        intervals for each co-benefit. The curve between points is smoothed to show the general
                        trends.</p>

                    <!-- Legend
                    <div id="main-legend" class="legend-box" style="margin-bottom: 5px;">
                        <strong style="margin-bottom: 0.5rem;">Legend:</strong> <br/>
                        <ul class="horizontal-legend-list" style="margin-bottom:5px">
                         {#each COBENEFS as cobenef}
                                <li><span class="legend-color"
                                          style="background-color: {COBENEFS_SCALE(cobenef.id)}"></span>
                                    <a href="{base}/cobenefit?cobenefit={cobenef.id}"
                                       target="_blank"
                                       class="link">
                                        {cobenef.label.split(" ").slice(0, 2).join(" ")}-->
                                        <!--{cobenef.label}
                                    </a>
                                </li>
                            {/each}

                        </ul>

                    </div>-->
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
                <div class="chart-shell with-bottom-badges" style={!dataLoaded ? `height: ${PER_CB_PLOT_HEIGHT}px;` : ''}>
                    {#if !dataLoaded}
                        <ChartSkeleton height={PER_CB_PLOT_HEIGHT}/>
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

  <!--  <div class="section" id="households">
        <div class="section-header">
            <p class="section-subtitle">Households</p>
            <h2 class="section-title">{NATION} social-economic factors</h2>
            <p class="description">We describe the distribution of household economic factors aggregated on the data
                zone level and the different level of co-benefits received by those data zones.</p>
        </div>

        <div id="se-block" class="component" style="margin-left: 1rem;">
            <div id="se-title">
                <h3 class="component-title">Comparing the Socio-Economic factors distributions of {NATION}
                    and {compareTo}, and their correlation with co-benefits.</h3>
                <br>-->


                <!-- Legend
                <div id="se-legend" class="legend-box">
                    <strong style="margin-bottom: 1rem;">Legend:</strong> <br/>
                    <ul class="legend-list">
                        <li><span class="legend-color" style="background-color: {VIS_COLOR}"></span>
                            {NATION}</li>
                        <li><span class="legend-color" style="background-color: {AVERAGE_COLOR}"></span>
                            {compareTo}</li>
                    </ul>
                </div>-->

                <!-- Interpretation
                <div id="se-legend" class="legend-box">
                    <strong style="margin-bottom: 1rem;">Interpreting the charts:</strong> <br/>
                    <p><strong>Barchart:</strong> Each bar represents the normalized frequency of datazones linked to a
                        given social economic factor value. </p>
                    <p><strong>Scatterplot:</strong> Each dot represents a datazone inside {NATION}. The cloud
                        shows the distribution for {compareTo}. </p>
                </div>-->

                <!-- Disclaimer
                <div id="se-disclaimer" class="disclaimer-box">
                    <p style="margin: 0 0 1rem 0;"><strong>Correlation ≠ Causation:</strong> The scatter plots represent
                        modelled associations and should not be interpreted as direct causal relationships. </p>
                    <p style="margin: 0 0 1rem 0;"><strong>Discrete scales:</strong> The first set of socio-economic
                        factors are using categorical values where the x-axis is non-linear: EPC, Tenure, Typology, Fuel
                        type, Gas flag, Number of cars.</p>
                </div>
            </div>-->

<!--
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
                                    <div class="plot" bind:this={SEFPlotLAD[sef.id]}>
                                    </div>
                                </div>


                                <div class="component column">
                                    <div>
                                        <h3 class="component-title">Co-benefits received by data zones
                                            across {sef.label}
                                            values</h3>
                                        <p class="description short">Density plot refers to UK distribution while the
                                            scattered points refer to data zones in {NATION}.</p>-->
                                        <!--                                    <div class="plot" bind:this={SEFPlotFullDistrib[sef]}>-->
                                        <!--                                    </div>
                                    <!--</div>

                                    <div>
                                        <div class="plot" bind:this={SEFPlotPerCB[sef.id]}>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                        </div>
                    </div>
                {/each}
            </div>
        </div>


    </div>
-->
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

    .chart-badge-bottom-right {
        position: absolute;
        right: -10px;
        bottom: 0px;
        z-index: 3;
        pointer-events: auto;
        display: flex;
        gap: 6px;
    }

    .map-info-badges {
        gap: 3px;
    }

    .header-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        margin-bottom: 2px;
    }

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

    /* Match co-benefit/local-authority pages: map badges aligned to bottom-right under the map */
    .chart-badges.map-info-badges {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
        pointer-events: auto;
        opacity: 0.98;
    }

    /* Reserve space so bottom-right badges don't overlap axis labels */
    .chart-shell.with-bottom-badges {
        padding-bottom: 35px;
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
    }

    #main-block {
        display: flex;
        /* width: 100%; */
        flex-direction: column;
        /* min-height: 70vh; */
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
        height: 650px;
        /*flex: 1; !* take the remaining height *!*/
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
        min-height: 180px;
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

    .legend-items-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0rem 1.5rem; /* row gap, column gap */
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

.component-left {
    flex: 1;
    background: #F8F8F8;
    border: 1px solid #ECECEC;
    border-radius: 15px;
    padding-left: 1%;
    padding-right: 1%;
    padding-top: 15px;
    padding-bottom: 10px;
    margin: 10px 0
}

.component-right {
    flex: 1.5;
    background: #F8F8F8;
    border: 1px solid #ECECEC;
    border-radius: 15px;
    padding-left: 1%;
    padding-right: 1%;
    padding-top: 15px;
    padding-bottom: 10px;
    margin: 10px 0
}
</style>
