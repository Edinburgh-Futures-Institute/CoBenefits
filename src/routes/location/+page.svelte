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
        removeSpinner,
        addSpinner,
        SEF_SCALE,
        getIconFromCobenef, COBENEFS_SCALE2,
        SE_FACTORS, SEF_LEVEL_LABELS
    } from "../../globals";
    import {getRandomSubarray} from "$lib/utils";

    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {
        getAllCBAllDatazones, getAllCBForOneLAD,
        getAverageCBGroupedByLAD,
        getSUMCBGroupedByLAD, getSUMCBGroupedByLADAndCB,
        getTableData, getTopSelectedLADs,
        getTotalCBAllDatazones, getTotalCBForOneLAD
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

    const LAD = data.LAD;
    let compareTo: "UK" | "England" | "Wales" | "NI" | "Scotland" = "UK"

    let totalCBAllZones;
    let allCBsAllZones;
    let totalCBAllLAD;

    let allCBAllLAD;

    let allCBAllLADSUM;

    let oneLADData;
    let oneLADAllCbs;

    let totalValue: number;
    let totalValuePerCapita: number;
    let totalValueMax: number;
    let totalValuePerCapitaMax: number;
    let totalValueMean: number;
    let totalValuePerCapitaMean: number;


    let dataLoaded = false;


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
        oneLADAllCbs = await getTableData(getAllCBForOneLAD(LAD));


        totalValue = (d3.sum(oneLADData, d => d.total) / 1000).toFixed(3);
        totalValueMax = d3.max(totalCBAllLAD, d => d.val) / 1000;

        // This is an approximation
        totalValuePerCapita = (d3.mean(oneLADData, d => d.totalPerCapita) * 1000000).toFixed(1);

        totalValuePerCapitaMax = await getTableData(getTopSelectedLADs({limit: 1, sortBy: "per_capita"}));
        totalValuePerCapitaMax = totalValuePerCapitaMax[0].value_per_capita;

        dataLoaded = true;
        removeSpinner(element)
    }

    $: {
        if (totalCBAllLAD) {
            totalValueMean = d3.mean(totalCBAllLAD.map(d => d.val)) / 1000;
            totalValuePerCapitaMean = d3.mean(totalCBAllLAD.map(d => d.value_per_capita)) * 100000;
        }
    }

    loadData();

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

    const LADToName = data.LADToName;

    let map: MapUK;
    let mapDiv: HTMLElement;

    onMount(() => {
        addSpinner(element)
        map = new MapUK(LAD, "LAD", mapDiv, "val", true, "Lookup_value", false, null, 8);
        map.initMap(false);

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

</script>


<NavigationBar></NavigationBar>
<!-- <StickyNav sectionRefs={sectionRefs}></StickyNav> -->


<div class="page-container" bind:this={element}>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
          <span class="mini-header-text">
            {LADToName[LAD]}
              {#if totalValue}
            <span class="mini-header-value">(Total: £{totalValue.toLocaleString()} billion)</span>
            {/if}
              >> {formatLabel(currentSection)}</span>

            </div>
        </div>
    {/if}

    <div class="section header header-row" id="head">
        <div>
            <p class="page-subtitle">Local Authority Report</p>
            <h1 class="page-title"> {LADToName[LAD]}</h1>
            <p class="description">Explore how this local authority will benefit from achieving Net Zero and learn about
                the characteristics of its households.</p>

            <div class="radio-set">
                Compare this Local Authority District (LAD) against:<br/>
                <input type="radio" on:change={onChangeComparison} name="compare" value="UK" checked>
                <label class="nation-label" for="html" >UK</label><br>
                <input type="radio" on:change={onChangeComparison} name="compare" value="England">
                <label class="nation-label" for="html">England</label><br>
                <input type="radio" on:change={onChangeComparison} name="compare" value="Wales">
                <label class="nation-label" for="html">Wales</label><br>
                <input type="radio" on:change={onChangeComparison} name="compare" value="Scotland">
                <label class="nation-label" for="javascript">Scotland</label>
                <input type="radio" on:change={onChangeComparison} name="compare" value="NI">
                <label class="nation-label" for="javascript">Northern Ireland</label>
            </div>
        </div>


        <div>
            <!--{d3.sum(totalCBAllZones.map(d => d.total))}-->
            {#if totalValue}

                <div class="waffle-stats">
                    <div class="waffle-stat">
                        <div class="waffle-value">
                            {@html
                                makeLADBarSVG(totalValue, totalValueMax, VIS_COLOR)
                            }
                            <span class="waffle-big">£{totalValue.toLocaleString()}</span>
                            <span class="small">billion</span>
                        </div>

                        <div class="waffle-value">
                            {@html
                                makeLADBarSVG(totalValueMean, totalValueMax, AVERAGE_COLOR)
                            }

                            {#if totalValue > 0}
                                <span class="waffle-caption">Local area benefits</span>
                            {:else}
                                <span class="waffle-caption">Local area costs</span>
                            {/if}
                        </div>
                    </div>
                    <div class="waffle-stat">
                        <div class="waffle-value">
                            {@html
                                makeLADBarSVG(totalValuePerCapita, totalValuePerCapitaMax, VIS_COLOR)
                            }
                            <span class="waffle-big">£{totalValuePerCapita.toLocaleString()}</span>
                            <span class="small"></span>
                        </div>

                        <div class="waffle-value">

                            {@html
                                makeLADBarSVG(totalValuePerCapitaMean, totalValuePerCapitaMax, AVERAGE_COLOR)
                            }

                            {#if totalValue > 0}
                                <span class="waffle-caption">Per capita benefits</span>
                            {:else}
                                <span class="waffle-caption">Per capita costs</span>
                            {/if}
                        </div>
                        <span class="waffle-caption"><i>Grey bars indicate average value for <span
                                class="nation-label">{compareTo}</span></i></span>

                    </div>
                </div>
            {/if}


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
                {@html renderDistributionPlot(totalCBAllZones, oneLADData)}

                <h3 class="component-title">11 types of co-benefit values (vs. <span
                        class="nation-label">{compareTo}</span> Average)</h3>
                <p class="description">Co-benefit values for {LADToName[LAD]} compared to average value of benefits
                    received across all local
                    authorities in <span class="nation-label">{compareTo}</span> (grey).</p>
                <div class="plot" bind:this={plotPerCb}>
                </div>
            </div>

            <div class="component column">
                <h3 class="component-title">Where is {LADToName[LAD]}?</h3>
                <p class="description">{LADToName[LAD]} has been highlighted in dark grey on this UK map.</p>
                <p class="description">*Scroll for zooming in and out</p>
                <div id="map" bind:this={mapDiv}>
                    <!--                    <div class="badge-container">-->
                    <!--                        <img class="badge" src={zoomBadge} />-->
                    <!--                    </div>-->
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

                <div class="plot side" bind:this={CBOverTimePLot}></div>


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
                    <div id="main-legend" class="legend-box" style="margin-bottom: 5px;">
                        <strong style="margin-bottom: 0.5rem;">Legend:</strong> <br/>
                        <ul class="horizontal-legend-list" style="margin-bottom:5px">
                            <!--                            <li><span class="legend-color" style="background-color: #D3A029"></span>-->
                            <!--                                Diet change-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #48773E"></span>-->
                            <!--                                Physical activity-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #183668"></span>-->
                            <!--                                Dampness-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #00AED9"></span>-->
                            <!--                                Excess cold-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #E11484"></span>-->
                            <!--                                Noise-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #71C35D"></span>-->
                            <!--                                Air quality-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #8F1838"></span>-->
                            <!--                                Congestion-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #EF402B"></span>-->
                            <!--                                Excess heat-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #F36D25"></span>-->
                            <!--                                Road safety-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #F99D26"></span>-->
                            <!--                                Road repairs-->
                            <!--                            </li>-->
                            <!--                            <li><span class="legend-color" style="background-color: #C31F33"></span>-->
                            <!--                                Hassle costs-->
                            <!--                            </li>-->

                            {#each COBENEFS as cobenef}
                                <li><span class="legend-color"
                                          style="background-color: {COBENEFS_SCALE(cobenef.id)}"></span>
                                    <a href="{base}/cobenefit?cobenefit={cobenef.id}"
                                       target="_blank"
                                       class="link">
                                        <!--{cobenef.label.split(" ").slice(0, 2).join(" ")}-->
                                        {cobenef.label}
                                    </a>
                                </li>
                            {/each}

                        </ul>

                    </div>

                </div>
                <div class="plot side" bind:this={CBOverTimePerCBPLot}></div>
                <!-- Disclaimer -->
                <div id="main-disclaimer" class="disclaimer-box">
                    <p style="margin: 0;"><strong>Some areas too small:</strong> Due to the nature of the
                        co-benefits some values are very small in comparison
                        to larger values so therefore are not visable on this plot. </p>
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

                <!-- Disclaimer -->
                <div id="se-disclaimer" class="disclaimer-box">
                    <p style="margin: 0 0 1rem 0;"><strong>Correlation ≠ Causation:</strong> The scatter plots represent
                        modelled associations and should not be interpreted as direct causal relationships. </p>
                    <p style="margin: 0 0 1rem 0;"><strong>Discrete scales:</strong> The first set of socio-economic
                        factors are using categorical values where the x-axis is non-linear: EPC, Tenure, Typology, Fuel
                        type, Gas flag, Number of cars.</p>
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
                                    <div class="plot" bind:this={SEFPlotLAD[sef.id]}>
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

</div>
<Footer></Footer>

<style>
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
</style>
