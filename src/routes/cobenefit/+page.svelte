<script lang="ts">
    import * as d3 from 'd3';
    import * as Plot from "@observablehq/plot";
    import {onMount} from 'svelte';

    import {Map} from "$lib/components/map";
    import {MARGINS, SEF, SEF_CATEGORICAL, type SEFactor, TIMES, COBENEFS_RANGE, getIconFromCobenef, COBENEFS_SCALE} from "../../globals";

    import AirqualityIcon from '$lib/icons/AirQuality.jpg';

    let element: HTMLElement
    let plot: HTMLElement
    let SEFPlot: Record<SEFactor, HTMLElement> = {};
    let chartType: "barchart" | "violin" | "distribution" = "barchart"

    let height = 400;

    // Data from load function
    export let data;

    const fullData = data.data;
    const SEFData = data.SEFData;
    const coBenefit = data.coBenefit;
    const LAD = data.LAD;

    let icon = getIconFromCobenef(coBenefit)
    
    let map: Map;

    let mapDiv: HTMLElement;
    let mapLegendDiv: HTMLElement;


    onMount(() => {
        map = new Map(fullData, "LSOA", mapDiv, "total");
        map.initMap();

        // let legendSvg = map.legend();
        // mapLegendDiv.append(legendSvg)
    })

function renderPlot() {
    
    let pivotedData = fullData.flatMap(d => {
        return TIMES.map(t => {
            return {time: t, value: d[t], total: d.total, scenario: d.scenario}
        })
    })
    
    if (chartType == "barchart") {
        plot?.append(
            Plot.plot({
                height: height / 1.4,
                ...MARGINS,
                style: {fontSize: "18px"},
                x: {
                    type: "band", 
                    tickFormat: d => d.replace(/^Y/, '').replace('_', '-'),
                    label:"Year Intervals"
                },
                y: {
                    label: "Total Cost Benefit (£)",
                    grid: true
                },
                marks: [
                    Plot.barY(pivotedData, Plot.groupX({y: "sum"}, {
                        x: "time",
                        y: "value",
                        fill: COBENEFS_SCALE(coBenefit),
                        tip: true,
                        fillOpacity: 0.8,
                        ry1:5,
                        insetLeft: 15,
                        insetRight:15
                    })),
                ]
            })
        );
    } else if (chartType == "distribution") {
        plot?.append(
            Plot.plot({
                height: height / 1.4,
                marginLeft: 60,
                marginRight: 60,
                y: {label: "Datazones Frequency"},
                style: {fontSize: "18px"},
                marks: [
                    Plot.areaY(pivotedData, Plot.binX({y: "count"}, {
                        x: "total",
                        fill:COBENEFS_SCALE(coBenefit),
                        tip: true,
                        fillOpacity: 0.5,
                        stroke: COBENEFS_SCALE(coBenefit),
                        strokeWidth: 3
                    }))                    
                ]
                })
            );
        }
    }


    function renderSEFPlot() {
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

        SEF.forEach(sef => {
            let plot;
            if (SEF_CATEGORICAL.includes(sef)) {
                plot = Plot.plot({
                    //title: sef,
                    style: {fontSize:"18px", textAnchor: "middle", fill:'#333'},
                    height: height/1.4,
                    width: height/1.5,
                    marginLeft: 30,
                    marginBottom: 60,
                    marginRight: 30,
                    marginTop: 20,
                    // y: {grid: true, label: "Average Cost Benefit (£)"},
                    // Very weird it's needed!
                    //x: {grid: true, label: sef, type: "band", tickFormat: d => Math.floor(d)},
                    x: {grid: true, label: null, type: "band", tickFormat: d => Math.floor(d)},
                    y: {label: null},
                    color: {legend: true},
                    marks: [
                        Plot.dot(SEFData.filter(d => d["SEFMAME"] == sef), {
                            x: "SE",
                            y: "total",
                            stroke: COBENEFS_SCALE(coBenefit),
                            r:1,
                            strokeOpacity: 0.2
                        })
                    ]
                })
            } else {
                plot = Plot.plot({
                    //title: sef,
                    style: {fontSize:"18px", textAnchor: "middle", fill:'#333'},
                    height: height/1.4,
                    width: height/1.5,
                    marginLeft: 30,
                    marginBottom: 60,
                    marginRight: 30,
                    marginTop: 20,
                    // y: {grid: true, label: "Average Cost Benefit (£)"},
                    // x: {grid: true, label: sef},
                    x: {grid: true, label: null},
                    y: {grid: true, label: null},
                    color: {legend: true},
                    marks: [
                        Plot.dot(SEFData.filter(d => d["SEFMAME"] == sef), {
                            x: "SE",
                            y: "total",
                            stroke: COBENEFS_SCALE(coBenefit),
                            r:1,
                            strokeOpacity: 0.2
                        }),
                    Plot.linearRegressionY(SEFData.filter(d => d["SEFMAME"] == sef), {
                            x: "SE",
                            y: "total",
                            stroke: '#555',
                            strokeWidth: 2,
                            strokeOpacity: 0.75,
                            strokeDasharray: "5,5",
                            clip: true
                        })]
                })
            }

            SEFPlot[sef]?.append(plot)
        })
    }


    $: {
        plot?.firstChild?.remove(); // remove old chart, if any
        Object.values(SEFPlot).forEach(sefPlot => {
          sefPlot.firstChild?.remove();
        })

        //ugly hack for reactivity
        if (chartType) {
        }

        if (height) {
            renderPlot();
            renderSEFPlot();
        }
    }

    $: textColor = COBENEFS_SCALE(coBenefit);
    $: cobensStyle = `color: ${textColor}; font-weight: bold; font-size: 22px;`;


    function onChange(event) {
        chartType = event.currentTarget.value;
    }
</script>


<div class="page-container" bind:this={element}>

    <div class="section header">
        <p class="page-subtitle">Co-Benefit Report</p>
        <h1 class="page-title"> 
            <img src={icon} alt="Icon" class="heading-icon">
            {coBenefit} 
        </h1>
        <p class="description"> Total cost benefit regarding <span style={cobensStyle}> {coBenefit}: [TOTAL] </span> </p>
    </div>

<!--    <div id="vis-block">-->
    <div class="section">


    <div id="vis-block">
        <div class="component singlevis" >
            <h3 class="component-title"> <span style={cobensStyle}>{coBenefit}</span> Total Cost Benefit Over Time</h3>

            <input type="radio" on:change={onChange} name="visType" value="barchart" checked>
            <label for="html">Barchart</label><br>
            <input type="radio" on:change={onChange} name="visType" value="distribution">
            <label for="javascript">Distribution</label>

            <div class="component row">
                <div class="plot" bind:this={plot}>
                </div>
            </div>
        </div>

        <div class="component column">
            <h3 class="component-title"> <span style={cobensStyle}>{coBenefit}</span> on UK Map</h3>
            <p class="description">Scroll for zooming in and out.</p>
            <div id="map" bind:this={mapDiv}>
            </div>
        </div>
    </div>
        </div>


    <div id="multiple-comp" class="component">
        <h3 class="component-title"> <span style={cobensStyle}>{coBenefit}</span> Cost Benefit by Socio Economic Factors </h3>
        <div id="multiple-plots">
            {#each SEF as sef}
            <div class="plot-container">
                <h3 class="component-title" style="text-align: center;"> {sef.replace('_', ' ')} </h3>
                <div class="plot" bind:this={SEFPlot[sef]}></div>
            </div>
            {/each}
        </div>
    </div>


</div>

<style>
    #vis-block {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1%;
        width: 100%;
    }


    #map {
        width: 100%;

        /*TODO: height is given by this currently but better to change at some point*/
        height: 400px;
        /*flex: 1; !* take the remaining height *!*/
    }

    #multiple-comp {
        grid-column: span 2 / span 2;
    }

    #multiple-plots {
        display: flex;
        gap: 1%;
        flex-direction: row;
        flex-flow: wrap;
        align-items: center;
        align-content: space-between;
        justify-content: center;
    }

    .heading-icon {
        width: 80px;
        height: 80px;
        margin-right: 15px;
        margin-top: 8px;
        margin-bottom: 8px;
        vertical-align: middle;
        object-fit: cover;
    }
</style>