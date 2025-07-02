<script lang="ts">
    import * as d3 from 'd3';
    import * as Plot from "@observablehq/plot";
    import {onMount, onDestroy} from 'svelte';
    import { base } from '$app/paths';
    import posthog from 'posthog-js';

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
        SEF_SCALE
    } from "../../globals";


    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {
        getSEFData,
        getTableData,
        getSEFbyCobenData,
        getSefForOneCoBenefit,
        getAggregationPerCapitaPerBenefit,
        getAverageSEFbyCobenDataGroupedByLAD
    } from "$lib/duckdb";

    import per_capita from '$lib/icons/per_capita.png';
    import total from '$lib/icons/total.png';
	import posthog from 'posthog-js';

    import negative from '$lib/icons/negative.png';
    import Footer from "$lib/components/Footer.svelte";


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
    console.log("SEF ", SEF)
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
        SEFData = await getTableData(getSEFbyCobenData(SEF));
        console.log("by cobens", SEFData);
        PCData = await getTableData(getAggregationPerCapitaPerBenefit());
        console.log("per_capita_data", PCData);
        averageValue = (
            d3.mean(fullData, d => d.val) ?? 0).toLocaleString('en-US',
            {minimumFractionDigits: 2, maximumFractionDigits: 2});
        modeNumeric = d3.mode(fullData, d => d.val);
        labelLookup = SEF_LEVEL_LABELS[sefId];
        modeValue = labelLookup?.[modeNumeric] ?? modeNumeric ?? "N/A";
        
        console.log("Average Value: ", averageValue);

        maxIndex = d3.maxIndex(fullData, d => d.val);
        maxLookupValue = maxIndex !== -1 ? fullData[maxIndex].Lookup_Value : "N/A";
        maxValue = (
            fullData[maxIndex]?.val ?? 0).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });

        minIndex = d3.minIndex(fullData, d => d.val);
        minLookupValue = minIndex !== -1 ? fullData[minIndex].Lookup_Value : "N/A";
        minValue = (
            fullData[minIndex]?.val ?? 0).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });

        CBS.forEach(CB => {
            SEFData[CB] = +SEFData[CB];
        })

        dataLoaded = true;
    }

    loadData().then(() => {
        map = new MapUK(fullData, "LSOA", mapDiv, "val", false, "Lookup_Value", false);
        map.initMap();

        // let legendSvg = map.legend();
        // mapLegendDiv.append(legendSvg)
    });

    function renderDistPlot() {
        const average = d3.mean(fullData, d => d.val) ?? 0;
        const maxY = d3.max(
            d3.bin().thresholds(20).value(d => d.val)(fullData),
            bin => bin.length
        );

        plotDist?.append(
            Plot.plot({
                height: height / 1.9,
                width: height * 1.7,
                marginLeft: 60,
                marginTop: 30,
                marginRight: 20,
                marginBottom: 50,
                x: {label: `${sefUnits}`},
                y: {label: 'No. of datazones', labelArrow: false},
                style: {fontSize: "16px"},
                marks: [
                    Plot.rectY(fullData, Plot.binX({y: "count"}, {
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
                    Plot.dot(fullData, {
                        x: {value: average, thresholds: 20},
                        y: maxY + 0.1 * maxY,
                        r: 5,
                        fill: "#BD210E"

                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            })
        );
    }

    function renderBarPlot() {
        const average = d3.mode(fullData, d => d.val) ?? 0;
        const maxY = d3.max(
            d3.bin().thresholds(20).value(d => d.val)(fullData),
            bin => bin.length
        );

        const labelLookup = SEF_LEVEL_LABELS[sefId];

        const fullLevels = labelLookup
            ? Object.keys(labelLookup).map(Number)
            : fullData.filter(d => d["SEFMAME"] == sefId).map(d => d.SE);

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
                        tickRotate: sefId === "Typology" ? -10 : 0
                    },
                y: {label: 'No. of datazones', labelArrow: false},
                style: {fontSize: "16px"},
                marks: [
                    Plot.barY(fullData, Plot.groupX({ y: "count" }, { x: "val", fill: "black", opacity: 0.5})),
                    Plot.ruleX([average], {
                                stroke: "#BD210E",
                                strokeWidth: 4,
                                channels: {average: {value: average, label: "Average"}},
                                tip: {format: {average:d => `${d.toFixed(2)}`, x:false}},
                            }),
                    Plot.dot(fullData, {
                        x: {value: average, thresholds: 20},
                        y: maxY + 0.1 * maxY,
                        r: 5,
                        fill: "#BD210E"

                    }),
                    // Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            })
        );
    }

    function renderDotPlot() {        
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
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(fullData, {
                        x: "val",
                        y: d => d.total_per_capita * 1000,
                        fill: d => d.total_per_capita < 0 ? '#BD210E'
                            : '#242424',
                        r: 0.9,
                        fillOpacity: 0.75,
                        channels: {
                            location: { value: "Lookup_Value", label: "Location" },
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
        const jitterAmount = 0.2; // tune as needed
        const jitteredData = fullData.map(d => ({
                ...d,
                jittered_val: d.val + (Math.random() - 0.5) * jitterAmount
            }));
            
        
        plotJitter?.append(
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
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(jitteredData, {
                        x: "jittered_val",
                        y: d => d.total_per_capita * 1000,
                        fill: d => d.total_per_capita < 0 ? '#BD210E' : '#242424',
                        r: 0.9,
                        fillOpacity: 0.75,
                        channels: {
                            location: { value: "Lookup_Value", label: "Location" },
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

    function renderMultPlotDot() {
        CBS.forEach(CB => {
            let plot;
            plot = Plot.plot({
                height: height,
                width: height,
                marginLeft: 60,
                marginTop: 10,
                marginRight: 10,
                marginBottom: 60,
                x: {label: null},
                y: {label: null},
                style: {fontSize: "12px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(SEFData.filter(d => d["co_benefit_type"] == CB), {
                        x: "val",
                        y: "total",
                        fill: COBENEFS_SCALE(CB),
                        fillOpacity: 0.5,
                        r:0.5,
                        channels: {
                            location: {value: "Lookup_Value", label: "Location"},
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
                        labelAnchor: "center"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            });
            plotSmallMult[CB]?.append(plot)
        })
    }

    function renderMultPlotJitter() {
        const jitterAmount = 0.2; // tune as needed
        const jitteredData = SEFData.map(d => ({
                ...d,
                jittered_val: d.val + (Math.random() - 0.5) * jitterAmount
            }));
        
        CBS.forEach(CB => {
            let plot;
            plot = Plot.plot({
                height: height,
                width: height,
                marginLeft: 60,
                marginTop: 10,
                marginRight: 10,
                marginBottom: 60,
                x: {label: null},
                y: {label: null},
                style: {fontSize: "12px"},
                marks: [
                    Plot.ruleY([0], {stroke: "#333", strokeWidth: 1.25}),
                    Plot.ruleX([0], {stroke: "#333", strokeWidth: 0.75}),
                    Plot.dot(jitteredData.filter(d => d["co_benefit_type"] == CB), {
                        x: "jittered_val",
                        y: "total",
                        fill: COBENEFS_SCALE(CB),
                        fillOpacity: 0.5,
                        r:0.5,
                        channels: {
                            location: {value: "Lookup_Value", label: "Location"},
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
                        labelAnchor: "center"
                    }),
                    Plot.axisX({label: `${sefUnits}`, labelArrow: false, labelAnchor: "center"}),
                ]
            });
            plotSmallJitter[CB]?.append(plot)
        })
    }

    function formatValue(value, unit) {
        return unit === "£" ? `${unit}${value}` : `${value} ${unit}`;
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
        plot?.firstChild?.remove(); // remove old chart, if any
        Object.values(plotSmallMult).forEach(multPlot => {
            multPlot.firstChild?.remove();
        })

        if (height && dataLoaded) {

            renderDistPlot();
            renderJitterPlot();
            renderBarPlot();
            renderDotPlot();
            // renderplotSmallMult();
            renderMultPlotDot();
            renderMultPlotJitter();
        }
    }


</script>

<NavigationBar></NavigationBar>

<div class="page-container" bind:this={element}>

    <div class="section header">
        <div class="header-content">
            <div class="header-text">
                <p class="page-subtitle">SEF Report</p>
                <div class="title-container">
                    <h1 class="page-title">{sefdescr}</h1>
                    <p class="definition">{sefDef}</p>
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
                    -
                    {:else}
                    Max value: <strong>{formatValue(maxValue, sefShortUnits)}</strong>({maxLookupValue})
                    {/if}
                </p>
                <p class="definition-stat">
                    {#if SEF_CATEGORICAL.includes(sefId)}
                        Most common category: <strong style="color: #BD210E;">{formatValue(modeValue, sefShortUnits)}</strong>
                    {:else}
                        Average value: <strong style="color: #BD210E;">{formatValue(averageValue, sefShortUnits)}</strong>
                    {/if}
                </p>
                <p class="definition-stat">
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    -
                    {:else}
                    Min value: <strong>{formatValue(minValue, sefShortUnits)}</strong>({minLookupValue})
                    {/if}
                </p>
            </div>
        </div>
    </div>

    {#if scrolledPastHeader}
        <div class="mini-header">
            <div class="mini-header-content">
        <span class="mini-header-text">
          {sefLabel} >> 
        </span>
            </div>
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
                    <p class="description">Each point in the chart below represents a UK data zone (LSOA). </p>
                    <div class="aggregation-icon-container">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{per_capita}" alt="icon"/>
                            <span class="tooltip-text">This chart uses per capita values. i.e. shows the cost/benefit per person in each AREA.</span>
                        </div>
                    </div>
                    {#if SEF_CATEGORICAL.includes(sefId)}
                    <div class="plot" bind:this={plotJitter}></div>
                    {:else}
                    <div class="plot" bind:this={plotDot}></div>
                    {/if}
                    
                </div>
                <div class="component column">
                    <h3 class="component-title">{sefLabel} </h3>
                    <p class="description">Scroll for zooming in and out.</p>
                    <div class="aggregation-icon-container2">
                        <div class="tooltip-wrapper">
                            <img class="aggregation-icon" src="{per_capita}" alt="icon" />
                            <span class="tooltip-text">These charts use per capita values. i.e. show the cost/benefit per person in each LAD.</span>
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
                <h3 class="component-title">Plotting <span style="background-color: #555; padding: 0 1px; color:#f9f9f9">{sefLabel.toLowerCase()}</span> against the gain/loss (£, thousand) per capita for each co-benefit</h3>
                <p class="explanation">Each plot shows the distribution of benefits or costs for each of the 11 co-benefits.</p>
                <br>

                <div class="aggregation-icon-container2">
                    <div class="tooltip-wrapper">
                        <span class="tooltip-text">These charts use per capita values. i.e. show the cost/benefit per person in each LAD.</span>
                    </div> 
                </div>
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
                                <div class="link-box">
                                Click <a class="link" href="{base}/cobenefit?cobenefit={CB.id}" target="_blank" rel="noopener noreferrer" style= "color:{COBENEFS_SCALE(CB.id)};">here</a> for the 
                                <span style= "color:{COBENEFS_SCALE(CB.id)};">{CB.id.toLowerCase()} </span>report page.
                                </div>
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
                            <h3 class="component-chart-title">{CB.label}</h3>
                            {#if CB.id == "Hassle costs"  || CB.id == "Road repairs" || CB.id == "Road safety" || CB.id == "Congestion" || CB.id == "Excess heat"}
                            <img class="sm-icon" src="{per_capita}" alt="icon" />
                            <img class="sm-icon" src="{negative}" alt="icon" />
                            {:else}
                            <img class="sm-icon" src="{per_capita}" alt="icon" />
                            {/if}
                        </div>
                            {#if SEF_CATEGORICAL.includes(sefId)}
                            <div class="plot" bind:this={plotSmallJitter[CB.id]}></div>
                            {:else}
                            <div class="plot" bind:this={plotSmallMult[CB.id]}></div>
                            {/if}
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

.link-box {
    margin: 0.5em 0em;
    border-left: 2px solid #555;
    padding-left: 0.4em;
    padding-right: 0.1em;
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
    margin-top: -5px;
    margin-left: 3px;
}

.component-chart-title-container {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>