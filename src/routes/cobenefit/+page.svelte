<script lang="ts">
    import * as d3 from 'd3';
    import * as Plot from "@observablehq/plot";
    import {onMount, onDestroy} from 'svelte';
    import {writable} from 'svelte/store';
    import {base} from "$app/paths";
    import posthog from 'posthog-js';


    import {MapUK} from "$lib/components/mapUK";
    import {
        MARGINS,
        SEF,
        SEF_CATEGORICAL,
        type SEFactor,
        TIMES,
        COBENEFS,
        COBENEFS_RANGE,
        getIconFromCobenef,
        COBENEFS_SCALE,
        type CoBenefit,
        COBENEFS_SCALE2,
        COBENEFS_SCALE3,
        SEF_UNITS,
        SEF_SCALE,
        DEFINITIONS,
        SE_FACTORS,
        SEF_LEVEL_LABELS

    } from "../../globals";
    import {
        getAverageCBGroupedByLAD,
        getSefForOneCoBenefit, getSefForOneCoBenefitAveragedByLAD,
        getTableData,
        getTotalPerOneCoBenefit,
        getAggregationPerBenefit,
        getAggregationPerCapitaPerBenefit,
        initDB,
        getTotalAggregation
    } from "$lib/duckdb";

    import NavigationBar from "$lib/components/NavigationBar.svelte";

    import total from '$lib/icons/total.png';
    import per_capita from '$lib/icons/per_capita.png';
    import percentage from '$lib/icons/percentage.png';
    import Footer from "$lib/components/Footer.svelte";

    let element: HTMLElement
    let plotDist: HTMLElement
    let plot: HTMLElement
    let SEFPlot: Record<SEFactor, HTMLElement> = {};
    let chartType: "barchart" | "violin" | "distribution" = "barchart"

    let height = 400;

    // Data from load function
    export let data;

    const coBenefit = data.coBenefit;
    const coBenefitLabel = COBENEFS.find(d => d.id === coBenefit)?.label ?? coBenefit;
    const coBenefitDef = DEFINITIONS.find(d => d.id === coBenefit)?.def ?? coBenefit;
    let fullData;
    let LADAveragedData;
    let SEFData;
    let totalValue;
    let aggregationPerBenefit;
    let aggregationPerCapitaPerBenefit;
    let totalBenefits;
    let totalBenefitsValue;
    let dataLoaded = false;
    let coBenefit_percapita;

    let map: MapUK;

    let mapDiv: HTMLElement;
    let mapLegendDiv: HTMLElement;

    loadData().then(() => {
        let colorRange = JSON.parse(JSON.stringify(COBENEFS_SCALE2(coBenefit)))
        colorRange.shift()
        colorRange = colorRange.reverse()

        map = new MapUK(LADAveragedData, "LAD", mapDiv, "total", true, "LAD", false, colorRange);
        map.initMap();
    });

    let icon = getIconFromCobenef(coBenefit)

    let scrolledPastHeader = false;
    let currentSection = '';
    const sectionIds = ['overview', 'compare'];

    let selectedNation = null;

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
                posthog.capture('section entered (coben)', {
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
            compare: 'Compare by socio-economic factor',
        };
        return labels[id] || '';
    }


    onMount(() => {
        window.addEventListener('scroll', handleScroll); // header scroll listener

        handleScroll(); // initialize
        return () => window.removeEventListener('scroll', handleScroll);
    })

    onDestroy(() => {
        window.removeEventListener('scroll', handleScroll); // remove listener
    })


    async function loadData() {
        fullData = await getTableData(getTotalPerOneCoBenefit(coBenefit))

        SEFData = await getTableData(getSefForOneCoBenefit(coBenefit))
        aggregationPerBenefit = await getTableData(getAggregationPerBenefit());
        aggregationPerBenefit = aggregationPerBenefit.sort((a, b) => b.total - a.total);

        aggregationPerCapitaPerBenefit = await getTableData(getAggregationPerCapitaPerBenefit());
        aggregationPerCapitaPerBenefit = aggregationPerCapitaPerBenefit.sort((a, b) => b.total_value - a.total_value);
        const matched = aggregationPerCapitaPerBenefit.find(d => d.co_benefit_type === coBenefit);
        coBenefit_percapita = matched ? matched.value_per_capita : null;

        // console.log("coben waffle data",aggregationPerCapitaPerBenefit);
        // console.log("coben type", coBenefit);

        LADAveragedData = await getTableData(getSefForOneCoBenefitAveragedByLAD(coBenefit))
        console.log("data", LADAveragedData);
        totalBenefits = await getTableData(getTotalAggregation())
        totalBenefitsValue = totalBenefits[0].total_value

        SEF.forEach(SE => {
            SEFData[SE] = +SEFData[SE];
        })

        totalValue = (d3.sum(fullData, d => d.total / 1000)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        dataLoaded = true;
    }

    let waffleData = [];
    let waffleEl: HTMLElement;
    let waffleBgEl: HTMLElement;

    function renderWaffle(height: number, highlightType?: string) {
        if (!waffleEl) return;

        const unitSize = 20;
        const gridWidth = 15;
        const gridHeight = Math.floor(200 / unitSize);
        const gridSize = gridWidth * gridHeight;

        const total = aggregationPerBenefit.reduce((sum, d) => sum + d.total, 0);
        const squares = [];

        for (const item of aggregationPerBenefit) {
            const absCount = Math.round((Math.abs(item.total) / total) * gridSize);
            const isNegative = item.total < 0;
            for (let i = 0; i < absCount; i++) {
                squares.push({
                    type: item.co_benefit_type,
                    negative: isNegative
                });
            }
        }

        while (squares.length < gridSize) {
            squares.push({type: "empty"});
        }

        squares.sort((a, b) => {
            if (a.type === "empty") return 1;
            if (b.type === "empty") return -1;
            if (a.negative && !b.negative) return 1;
            if (!a.negative && b.negative) return -1;
            return 0;
        });

        const waffleData = squares.map((d, i) => ({
            x: i % gridWidth,
            y: Math.floor(i / gridWidth),
            ...d
        }));

        const plot = Plot.plot({
            width: unitSize * gridWidth,
            height: unitSize * gridHeight,
            margin: 0,
            x: {axis: null},
            y: {axis: null},
            color: {
                type: "ordinal",
                domain: COBENEFS.map(d => d.id),
                range: COBENEFS_RANGE,
                unknown: "#eee",
                legend: false
            },
            marks: [
                Plot.rect(waffleData.filter(d => !d.negative), {
                    x: d => d.x * unitSize,
                    y: d => d.y * unitSize,
                    fill: "type",
                    fillOpacity: d => (highlightType && d.type !== highlightType ? 0.15 : 1)
                }),
                Plot.rect(waffleData.filter(d => d.negative), {
                    x: d => d.x * unitSize,
                    y: d => d.y * unitSize,
                    stroke: "type",
                    strokeOpacity: d => (highlightType && d.type !== highlightType ? 0.15 : 1),
                    strokeWidth: 1,
                    fill: "none"
                })
            ]
        });

        if (waffleBgEl) {
            waffleBgEl.style.width = `${unitSize * gridWidth}px`;
            waffleBgEl.style.height = `${height - 100}px`;
        }
        ;

        waffleEl.innerHTML = "";
        waffleEl.append(plot);
    }

    function renderDistPlot() {
        plotDist?.append(
            Plot.plot({
                height: height / 1.5,
                ...MARGINS,
                marginLeft: 90,
                marginTop: 40,
                marginRight: 40,
                y: {label: "Number of Datazones", grid: true},
                x: {label: 'Total co-benefit value (£, billion)', labelArrow: 'none', labelAnchor: "center"},
                style: {fontSize: "15px"},
                marks: [
                    Plot.rectY(LADAveragedData, Plot.binX({y: "count"}, {
                        x: d => d.total * 1000,
                        fill: COBENEFS_SCALE2(coBenefit)[0],
                        tip: true,
                        fillOpacity: 0.5,
                        stroke: COBENEFS_SCALE2(coBenefit)[0],
                        strokeWidth: 2
                    })),
                    Plot.axisY({
                        anchor: "left",
                        label: 'Number of datazones',
                        labelArrow: 'none',
                        labelAnchor: "center"
                    }),
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75}),
                ]
            })
        );
    }

    function renderPlot() {

        let pivotedData = fullData.flatMap(d => {
            return TIMES.map(t => {
                return {time: t, value: d[t], total: d.total, scenario: d.scenario}
            });
        });

        plot?.append(
            Plot.plot({
                height: height / 1.5,
                marginLeft: 80,
                marginRight: 40,
                marginBottom: 60,
                marginTop: 40,
                style: {fontSize: "15px"},
                x: {
                    type: "band",
                    tickFormat: d => d.replace(/^Y/, '').replace('_', '-'),
                    label: "Year Intervals",
                },
                y: {grid: true, label: 'Total (£, billion)'},
                marks: [
                    Plot.barY(pivotedData, Plot.groupX({y: "sum"}, {
                        x: "time",
                        y: d => d.value / 1000,
                        fill: COBENEFS_SCALE2(coBenefit)[0],
                        tip: {format: {y: d => `${d.toFixed(2)}`, x: false}},
                        fillOpacity: 0.8,
                        //ry1: 5,
                        insetLeft: 15,
                        insetRight: 15,
                    })),
                    Plot.axisY({
                        anchor: "left",
                        grid: true,
                        label: 'Total co-benefit value (£, billion)',
                        labelArrow: 'none',
                        labelAnchor: "center"
                    }),
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75})
                ]
            })
        );
    }

    function renderSEFPlot() {
        const nationCode = d => d.LAD.startsWith("S") ? "S"
            : d.LAD.startsWith("N") ? "N"
                : d.LAD.startsWith("E") ? "E"
                    : "W";
        // FACETED CHART
        // SEFPlotLAD?.append(
        //     Plot.plot({
        //         height: height,
        //         width: 2000,
        //         // marginLeft: 170,
        //         // marginBottom: 50,
        //         // marginTop: 30,
        //         // y: {grid: true, axis: showAxes},
        //         // x: {grid: true, axis: showAxes},
        //         style: {fontSize: "22px"},
        //         color: {legend: true},
        //         marks: [
        //             Plot.areaY(SEFData, Plot.binX({y: "mean"}, {x: "SE", y: "total", fx: "SEFMAME"})),
        //         ]
        //     })
        // )
        SEF.forEach((sef, i) => {
            let plot;
            if (SEF_CATEGORICAL.includes(sef)) {
                const labelLookup = SEF_LEVEL_LABELS[sef];

                const fullLevels = labelLookup
                    ? Object.keys(labelLookup).map(Number)
                    : LADAveragedData.filter(d => d["SEFMAME"] == sef).map(d => d.SE);
                    

                plot = Plot.plot({
                    style: {fontSize: "14px", textAnchor: "middle", fill: '#333'},
                    height: height / 1.4,
                    width: height * 1.2,
                    marginLeft: 70,
                    marginBottom: sef === "Typology" ? 80 : 60,
                    marginRight: 20,
                    marginTop: 30,
                    x: {
                        domain: fullLevels,
                        label: SEF_SCALE(sef),
                        tickFormat: d => labelLookup?.[d] ?? d,
                        tickRotate: sef === "Typology" ? -20 : 0
                    },
                    y: {label: '£, thousand', labelArrow: 'none'},
                    color: {legend: true},
                    marks: [
                        Plot.dot(LADAveragedData.filter(d => d["SEFMAME"] == sef), {
                            x: "SE",
                            y: d => d.total * 1000,
                            r: 1.8,
                            fillOpacity: 0.7,
                            fill: d =>
                                d.LAD.startsWith("S") ? COBENEFS_SCALE3(coBenefit)[1] :
                                d.LAD.startsWith("N") ? COBENEFS_SCALE3(coBenefit)[2] :
                                d.LAD.startsWith("E") ? COBENEFS_SCALE3(coBenefit)[3] :
                                COBENEFS_SCALE3(coBenefit)[4]
                        }),
                        Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75})
                    ]
                })
            } else {

                let dataToPlot = LADAveragedData.filter(d =>
                    d["SEFMAME"] === sef &&
                    (selectedNation === null || nationCode(d) == selectedNation)
                )

                let pointToAnnotate = dataToPlot.reduce(function (prev, curr) {
                    return prev.SE < curr.SE ? prev : curr;
                });

                plot = Plot.plot({
                    //title: sef,
                    style: {fontSize: "14px", textAnchor: "middle", fill: '#333'},
                    height: height / 1.4,
                    width: height * 1.2,
                    marginLeft: 70,
                    marginBottom: 60,
                    marginRight: 20,
                    marginTop: 30,
                    // y: {grid: true, label: "Average Cost Benefit (£)"},
                    x: {label: SEF_SCALE(sef), labelArrow: false, labelAnchor: "center"},
                    y: {label: '£, thousand', labelArrow: false},
                    color: {legend: true},
                    marks: [

                        // annotation
                        (i == 6) ? Plot.tip(
                            // [`A dot is a Local Authority District (LAD)`],
                            [`Each dot represents a Local Authority District (LAD).`],
                            {
                                x: (["Under_35", "Over_65", "Unemployment"].includes(sef) ? pointToAnnotate.SE * 100 : pointToAnnotate.SE),
                                y: pointToAnnotate.total * 1000,
                                textPadding: 6,
                                opacity: 0.5,
                                // textOverflow: "",
                                lineWidth: 12
                            }
                        ) : [],

                        Plot.dot(dataToPlot, {
                            x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef) ? d.SE * 100 : d.SE),
                            y: d => d.total * 1000,
                            fill: d => {
                                const index = ["S", "N", "E", "W"].indexOf(nationCode(d));
                                return COBENEFS_SCALE3(coBenefit)[index];
                            },
                            r: 2,
                            fillOpacity: 0.1,
                            channels: {LAD: "LAD"},
                            // tip: {
                            //     format: {
                            //         LAD: true,
                            //         test: "yes",
                            //         // sport: true,
                            //         // nationality: true,
                            //         y: false,
                            //         x: false,
                            //         // stroke: false
                            //     }
                            // }
                        }),

                        // Second: selected points (drawn second, appear on top)
                        Plot.dot(dataToPlot, {
                            x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef) ? d.SE * 100 : d.SE),
                            y: d => d.total * 1000,
                            fill: d => {
                                const index = ["S", "N", "E", "W"].indexOf(nationCode(d));
                                return COBENEFS_SCALE3(coBenefit)[index];
                            },
                            r: 3.5,
                            fillOpacity: 1
                        }),
                        Plot.axisX({label: SEF_SCALE(sef), labelArrow: false, labelAnchor: "center"}),
                        Plot.ruleY([0], {stroke: "#333", strokeWidth: 0.75}),
                        Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),

                        Plot.tip(dataToPlot, Plot.pointer({
                            x: d => (["Under_35", "Over_65", "Unemployment"].includes(sef) ? d.SE * 100 : d.SE),
                            y: d => d.total * 1000,
                            title: (d) => [`LAD: ${d.LAD}`, "Click to navigate to page."].join("\n")
                        })),

                        //Plot.linearRegressionY(SEFData.filter(d => d["SEFMAME"] == sef), {
                        //  x: "SE",
                        //  y: "total",
                        //  stroke: '#F0F0F0',
                        //  strokeWidth: 4,
                        //  strokeOpacity: 0.75,
                        //  strokeDasharray: "5,5",
                        // clip: true
                        //}),
                        //Plot.linearRegressionY(SEFData.filter(d => d["SEFMAME"] == sef), {
                        //  x: "SE",
                        //  y: "total",
                        //  stroke: '#222',
                        //  strokeWidth: 2,
                        //  strokeOpacity: 0.75,
                        //  strokeDasharray: "5,5",
                        //  clip: true
                        //})
                    ]
                })

                console.log(d3.select(plot)
                    .select('g[aria-label="dot"]')
                    .selectAll("circle"))

                d3.select(plot)
                    .selectAll('g[aria-label="dot"]')
                    .selectAll("circle")
                    .style("cursor", "pointer")
                    .on("click", (e, i, d) => {
                        let lad = dataToPlot[i].LAD;

                        // let text = event.target.textContent;
                        // let cb = COBENEFS.find((d) => d.id == text)
                        window.open(`${base}/location?location=${lad}`, '_blank').focus();
                    })

            }

            SEFPlot[sef]?.append(plot)
        })
    }

    $: if (height && dataLoaded) {
        plot?.firstChild?.remove();
        renderDistPlot();
        renderPlot();
        renderWaffle(300, coBenefit);
    }

    $: if (height && dataLoaded && selectedNation !== undefined) {
        Object.values(SEFPlot).forEach(sefPlot => {
            sefPlot.firstChild?.remove();
        });
        renderSEFPlot();
    }

    $: textColor = COBENEFS_SCALE2(coBenefit)[0];
    $: cobensStyle = `color: ${textColor}; font-weight: bold; font-size: 22px;`;

    // $: cobensNavStyle = `color: ${textColor}; font-weight: bold; font-size: 14px;`;


    function onChange(event) {
        chartType = event.currentTarget.value;
    }

    function resetSelection() {
        selectedNation = null;
    }


    onMount(() => {
        document.querySelectorAll(".nation-button").forEach(button => {
            button.addEventListener("click", () => {
                const nation = button.getAttribute("data-nation");

                if (selectedNation === nation) {
                    selectedNation = null;
                    button.classList.remove("active");
                } else {
                    selectedNation = nation;
                    document.querySelectorAll(".nation-button").forEach(btn => btn.classList.remove("active"));
                    button.classList.add("active");
                }
            });
        });
    });

</script>

<NavigationBar></NavigationBar>

<div class="page-container" bind:this={element}>

    <div class="section header">
        <div class="header-content">
            <div class="header-text">
                <p class="page-subtitle">Co-Benefit Report</p>
                <div class="title-container">
                    <h1 class="page-title">
                        <img src={icon} alt="Icon" class="heading-icon"/>
                        <div style="margin-top: 10px;"></div>
                        {coBenefitLabel}
                    </h1>
                    <div style="margin-top: 14px;"></div>
                    <p class='definition'> {coBenefitDef} </p>
                </div>

            </div>
            <div class="header-waffle-wrapper">
                <div class="waffle-label">
                    <div class="waffle-stats">
                        <div class="waffle-stat">
                            <div class="waffle-value-container">
                            <img class="aggregation-icon-small" src="{total}" alt="icon"/>
                            <div class="waffle-value">
                                {#if totalValue}
                                    <span class="waffle-big">£{totalValue.toLocaleString()}</span>
                                {/if}
                                <span class="small">billion</span>
                            </div>
                        </div>
                            {#if totalValue > 0}
                                <div class="waffle-caption">National benefits</div>
                            {:else}
                                <div class="waffle-caption">National costs</div>
                            {/if}
                        
                        </div>
                        <div class="waffle-stat">
                            <div class="waffle-value-container">
                                <img class="aggregation-icon-small" src="{per_capita}" alt="icon"/>
                            <div class="waffle-value">
                                {#if totalValue}
                                    <span class="waffle-big">£{coBenefit_percapita.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}</span>
                                {/if}
                            </div>
                        </div>
                            {#if totalValue > 0}
                                <div class="waffle-caption">Per capita benefits</div>
                            {:else}
                                <div class="waffle-caption">Per capita costs</div>
                            {/if}
                        </div>
                        
                        <div class="waffle-stat">
                            <div class="waffle-value-container">
                                <img class="aggregation-icon-small" src="{percentage}" alt="icon"/>
                            {#if totalValue}
                                <div class="waffle-value">
                                    <span class="waffle-big">{((totalValue / totalBenefitsValue) * 100).toFixed(2)}</span>
                                    <span class="small">%</span>
                                </div>
                            {/if}
                        </div>
                            <div class="waffle-caption">Contribution to national benefits</div>
                        </div>
                    </div>
                    
                </div>
                <h3 class="component-title"> Share of total benefits </h3>
                <div class="waffle-el" bind:this={waffleEl}></div>
                <div class="waffle-bg" bind:this={waffleBgEl}></div>
            </div>
        </div>
    </div>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
                <img src={icon} alt="Icon" class="mini-heading-icon"/>
                <span class="mini-header-text">
            {coBenefitLabel}
                    {#if totalValue}
            <span class="mini-header-value">(UK total: £{totalValue} billion)</span>
            {/if}
                    >> {formatLabel(currentSection)}</span>

            </div>
        </div>
    {/if}


    <div class="section">
        <div id="overview">
            <div class="section-header">
                <p class="section-subtitle">Overview</p>
            </div>
            <div id="vis-block">
                <div class="component singlevis">
                    <h3 class="component-title">Total <span
                            style={cobensStyle}>{coBenefitLabel.toLowerCase()}</span> over time 2025-2050
                    </h3>
                    {#if totalValue > 0}
                        <!-- <p class="description">The total benefit for each 5 year interval towards 2050. </p> -->
                        <p class="description">Each bar shows the predicted total benefits in billion pounds for each
                            five-year periods for all of UK.</p>
                    {:else}
                        <!-- <p class="description">The total cost/benefit for each 5 year interval towards 2050. </p> -->
                        <p class="description">Each bar shows the predicted total costs in billion pounds for each
                            five-year periods for all of UK.</p>
                    {/if}
                    <div class="aggregation-icon-container">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{total}" alt="icon"/>
                            <span class="tooltip-text">This chart uses total values. i.e. shows the total benefit/cost for all of the UK.</span>
                        </div>
                    </div>
                    <div class="plot-bar" bind:this={plot}></div>
                    <!-- <p class="explanation">Each bar shows the total benefits obtain within the given period.</p> -->

                    <br>
                    <h3 class="component-title"> Distribution of <span
                            style={cobensStyle}>{coBenefitLabel.toLowerCase()}</span> across UK
                        <!-- <span style={{ textDecoration: "underline dotted", cursor: "help" }} title="Data zones are standard statitical geographies in UK that  comprise between 400 and 1200 households.">
                        data zones
                        </span> -->

                        <span class="tooltip-term">
                                data zones
                                <span class="tooltip-txt">
                                Data zones are standard statitical geographies in UK that  comprise between 400 and 1200 households.
                                </span>
                            </span>
                    </h3>
                    {#if totalValue > 0}
                        <p class="description">The x-axis represents the predicted value of benefits, measured in
                            billion pounds, while the y-axis shows the number of data zones falling within each benefit
                            range.</p>
                    {:else}
                        <!-- <p class="description"> The total cost/benefit for each data zone across the UK. </p> -->
                        <p class="description">The x-axis represents the value of costs, while the y-axis shows the
                            number of data zones falling within each benefit range.</p>
                    {/if}
                    <div class="aggregation-icon-container">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{total}" alt="icon"/>
                            <span class="tooltip-text">This chart uses total values. i.e. shows the total benefit/cost for all of the UK.</span>
                        </div>
                    </div>
                    <div class="plot-bar" bind:this={plotDist}>

                    </div>
                    <br>
                    <!-- <p class="explanation">``Bumps'' in the chart indicate </p> -->
                </div>


                <div class="component column">
                    <h3 class="component-title">Per Capita <span
                            style={cobensStyle}>{coBenefitLabel.toLowerCase()}</span> by UK local authorities</h3>
                    <p class="description">Each local authority is coloured by the predicted per capita benefits/cost,
                        showing regional variation in how benefits/cost are distributed. Scroll for zooming in and
                        out.</p>
                    <!--                    <div class="aggregation-icon-container2">-->
                    <!--                        <div class="tooltip-wrapper">-->
                    <!--                            <img class="aggregation-icon" src="{total}" alt="icon"/>-->
                    <!--                            <span class="tooltip-text">This chart uses total values. i.e. shows the total benefit/cost for all of the UK.</span>-->
                    <!--                        </div>-->
                    <!--                    </div>-->
                    <div class="aggregation-icon-container2">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{per_capita}" alt="icon"/>
                            <span class="tooltip-text">This chart uses per capita values. i.e. show the cost/benefit per person in each LAD.</span>
                        </div>
                    </div>

                    {#if map}
                        <div id="legend">
                            {@html map.legend().outerHTML}
                        </div>
                    {/if}
                    <div id="map" bind:this={mapDiv}>
                    </div>
                </div>
            </div>
        </div>

        <div id="compare">
            <!-- <div class="section-header">
            <p class="section-subtitle">Compare by socio-economic factor</p>
            </div> -->

            <div class="section-header">
                <p class="section-subtitle">Socio-economic factors</p>
            </div>
            <div id="se-block" class="component" style="margin-left: 1rem;">
                <div id="se-title">
                    <h3 class="component-title">How <span
                            style={cobensStyle}>{coBenefitLabel?.toLowerCase()}</span> vary by household social-economic
                        factors</h3>
                    <p class="explanation">Each chart shows how benefits or costs are distributed across UK local
                        authorities in correlation with a specific household social-economic factor.</p>


                    <!-- Legend -->
                    <div id="se-legend" class="legend-box">
                        <div class="aggregation-icon-container2">
                            <div class="tooltip-wrapper">
                                <img class="aggregation-icon" src="{per_capita}" alt="icon"/>
                                <span class="tooltip-text">These charts use per capita values. i.e. show the cost/benefit per person in each LAD.</span>
                            </div>
                        </div>

                        <strong style="margin-bottom: 0.8rem;">Legend:</strong> <br/>
                        <span>The scatter points are coloured by nation. Click the buttons below to filter.</span>

                        <div class="legend-buttons">
                            <br>
                            <button class="nation-button" data-nation="S"
                                    style="background-color: {COBENEFS_SCALE3(coBenefit)[0]}">Scotland
                            </button>
                            <button class="nation-button" data-nation="N"
                                    style="background-color: {COBENEFS_SCALE3(coBenefit)[1]}">Northern Ireland
                            </button>
                            <button class="nation-button" data-nation="E"
                                    style="background-color: {COBENEFS_SCALE3(coBenefit)[2]}">England
                            </button>
                            <button class="nation-button" data-nation="W"
                                    style="background-color: {COBENEFS_SCALE3(coBenefit)[3]}">Wales
                            </button>
                            <br>
                            <button class="reset-button" on:click={resetSelection}>Reset</button>
                        </div>
                    </div>


                    <!-- Disclaimer -->
                    <div id="se-disclaimer" class="disclaimer-box">
                        <p style="margin: 0 0 0.5rem 0;"><strong>Discrete scales:</strong> The first set of
                            socio-economic factors are using categorical values where the x-axis is non-linear.</p>
                        <p style="margin: 0 0 0.5rem 0;"><strong>Correlation ≠ Causation:</strong> The scatter plots
                            represent modelled associations and should not be interpreted as direct causal
                            relationships. </p>
                        <p style="margin: 0 0 0.5rem 0;"><strong>Aggregated data:</strong> Each socio-economic factor
                            for a given local authority is aggregated from the data zones within its boundary. </p>
                    </div>

                </div>


                <div id="multiple-comp">
                    <div id="multiple-plots">
                        {#each SE_FACTORS as sef}
                            <div class="plot-container">
                                <h3 class="component-chart-title">{sef.label}</h3>
                                <p class="component-chart-caption">{sef.def}</p>
                                <div class="plot" bind:this={SEFPlot[sef.id]}></div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<Footer></Footer>

<style>
    #vis-block {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1%;
        width: 100%;
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


    #map {
        width: 100%;

        /*TODO: height is given by this currently but better to change at some point*/
        height: 600px;
        /*flex: 1; !* take the remaining height *!*/
    }

    #multiple-comp {
        /* grid-column: span 2 / span 2; */
        width: 100%;
        padding: 1rem 0;
    }

    /* #multiple-plots {
        display: flex;
        gap: 1%;
        flex-direction: row;
        flex-flow: wrap;
        align-items: center;
        align-content: space-between;
        justify-content: center;
    } */

    #multiple-plots {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        justify-items: start;
    }


    .plot-container {
        width: 100%;
        margin-bottom: 20px;
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


    /* .heading-icon {
        width: 80px;
        height: 80px;
        margin-right: 15px;
        margin-top: 8px;
        margin-bottom: 8px;
        vertical-align: middle;
        object-fit: cover;
    }

    .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    .title-container {
        display: flex;
        align-items: top;
        font-size: 36px;
    }

    .total-value-container {
        text-align: right;
    }

    .total-value {
        font-size: 36px;
        font-weight: bold;
        color: #555;
        margin-right: 30px;
    } */

    .heading-icon {
        width: 4rem;
        height: 4rem;
    }


    .section.header {
        padding: 2% 6%;
        background-color: #f9f9f9;
    }

    .header-content {
        display: flex;
        align-items: top;
        justify-content: space-between;
        flex-wrap: wrap;
    }

    .header-text {
        max-width: 60%;
        height: 100%;
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


    .total-value {
        font-weight: bold;
        margin-top: 0.5rem;
    }

    .description {
        margin-top: .9rem;
        font-size: .9rem;
        color: #333;
    }

    .header-waffle {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1rem;
        min-width: 120px;
    }

    .header-waffle-wrapper {
        position: relative;
        min-width: 120px;
        height: 2%;
    }

    .waffle-bg {
        position: absolute;
        top: 0;
        left: 0;
        background: white;
        z-index: -1;
    }


    .waffle-label {
        position: absolute;
        top: 50%;
        right: 105%;
        transform: translateY(-50%);
        width: 150px;

        /* background-color: #fff; */
        /* border: 1px solid #ddd; */
        border-radius: 0.5rem;
        padding: 1rem;
        font-size: 0.9rem;
        line-height: 1.1;
        color: #333;
        text-align: left;
        /* box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); */
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
        font-size: 1rem;
    }

    .legend-color {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 10px;
        border-radius: 2px;
    }

    .waffle-stats {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .waffle-stat {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .waffle-value-container {
        display: flex;
        align-items: center;
        gap: 8px; /* space between icon and number */
    }

    .waffle-value {
        display: flex;
        align-items: baseline;
        gap: 0.3rem;
    }

    .waffle-big {
        font-size: 1.3rem;
        font-weight: 500;
    }

    .small {
        font-size: 0.9rem;
        color: black;
    }

    .waffle-caption {
        margin-top: 0.2rem;
        font-size: 0.85rem;
        color: black;
    }

    .definition {
        max-width: 550px;
        font-size: 1rem;
        line-height: 1.25rem;
    }

    .plot-bar {
        margin-top: -60px; /* pull it upward */
    }

    .legend-buttons {
        /*display: flex;*/
        gap: 0px;
        /*flex-wrap: wrap;*/
        margin-bottom: 0px;
        margin-top: -20px;
    }

    .nation-button {
        gap: 0px;
        margin-top: 0.5rem;
        margin-bottom: 0rem;
        margin-right: 0.2rem;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        color: #F8F8F8;
        font-weight: bold;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        opacity: 1;
    }

    .nation-button:hover {
        transform: scale(1.05);
        opacity: 0.8;
    }

    .reset-button {
        margin-top: 1rem;
        margin-left: 0rem;
        padding: 0.5rem 1rem;
        background-color: #eee;
        border: 1px solid #aaa;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }

    .reset-button:hover {
        background-color: #ddd;
    }

    .aggregation-icon-container2 {
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        width: 92%;
        margin-top: -25px;
        margin-bottom: -25px;
        margin-right: 10px;
    }

    .aggregation-icon-container2 {
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        width: 99%;
        margin-top: -10px;
        margin-bottom: -30px;
        margin-right: 0px;
        margin-left: 0px;
    }

    .aggregation-icon-small {
    width: 30px;
    height: 30px;
    opacity: 1;
}

</style>