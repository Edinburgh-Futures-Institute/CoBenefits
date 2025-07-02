<script lang="ts" async>
    import * as d3 from 'd3';
    import * as Plot from "@observablehq/plot";
    import {onMount} from 'svelte';
    import {base} from '$app/paths';
    import posthog from 'posthog-js';

    import * as maplibregl from "maplibre-gl"
    import "maplibre-gl/dist/maplibre-gl.css";
    import {
        getCustomCBData,
        getAverageCBGroupedByLAD,
        getTableData,
        getTotalPerPathway,
        getAverageSEFGroupedByLAD, getSEFData, getSUMCBGroupedByLAD, getModeSEFGroupedByLAD
    } from "$lib/duckdb";
    import {
        type CoBenefit,
        COBENEFS,
        type Scenario,
        SEF,
        getIconFromCobenef,
        COBENEFS_SCALE2,
        SEF_SCALE, SE_FACTORS, SEF_CATEGORICAL, SEF_LEVEL_LABELS, type SEFactor
    } from "../../globals";
    import {Legend} from "$lib/utils";
    import {MapUK} from "$lib/components/mapUK";
    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {COBENEFS_RANGE2} from "../../globals.js";
    import Footer from "$lib/components/Footer.svelte";


    export let data;

    let element: HTMLElement
    let mapDiv: HTMLElement;
    let legendSvg: SVGSVGElement | null;
    let legendDiv: HTMLElement;
    let exportButton: HTMLElement;
    let map: MapUK;
    let mapType: "Cobenefit" | "SEF" = "Cobenefit";
    let loadLayers = false;


    // Main data
    let cobenefData: Array<Record<any, any>>;

    let scenario: Scenario = "BNZ";
    // let coBenefits: Set<string> = new Set(COBENEFS.map(d => d.id));
    let coBenefits: Array<CoBenefit> = COBENEFS.map(d => d.id);

    let timeSelected: string = "total";
    let mapStyleLoaded = false;
    let granularity: "LSOA" | "LAD" = "LAD";
    // let granularity: "LSOA" | "LAD" = "LSOA";

    let selectedSef: SEFactor = "EPC";
    let fullData;


    $: {
        if (map?.loaded) {

            if (mapType == "Cobenefit") {
                map.dataKey = "value_per_capita";
                if (granularity == "LAD") {
                    fullData = getTableData(getSUMCBGroupedByLAD(Array.from(coBenefits), "UK", timeSelected))
                    // fullData = getTableData(getAverageCBGroupedByLAD(Array.from(coBenefits), scenario, timeSelected))
                } else if (granularity == "LSOA") {
                    let cbs;
                    if (coBenefits.length == 11) {
                        cbs = []
                    } else {
                        cbs = coBenefits
                    }
                    // fullData = getTableData(getCustomCBData(Array.from(coBenefits), scenario, timeSelected))
                    fullData = getTableData(getCustomCBData(cbs, scenario, timeSelected))
                }
            } else if (mapType = "SEF") {
                map.dataKey = "val";
                if (granularity == "LAD") {

                    if (SEF_CATEGORICAL.includes(selectedSef)) {
                        fullData = getTableData(getModeSEFGroupedByLAD(selectedSef))
                    } else {
                        fullData = getTableData(getAverageSEFGroupedByLAD(selectedSef))
                    }
                } else if (granularity == "LSOA") {
                    fullData = getTableData(getSEFData(selectedSef))
                }
            }


            fullData.then((data) => {

                // Convert from millions to £
                if (mapType == "Cobenefit") {
                    data.forEach(d => {
                        d.value_per_capita = d.value_per_capita * 1000000
                    })
                }

                // Load layers again when changing granularity
                // let loadLayers = false;
                // if (map.map.getStyle().layers.length == 0) {
                //     loadLayers = true;
                // }

                let colorRange;

                if (mapType == "Cobenefit") {
                    if (coBenefits.length == 1) {
                        colorRange = JSON.parse(JSON.stringify(COBENEFS_SCALE2(coBenefits[0])))
                        colorRange.shift()
                        colorRange = colorRange.reverse()
                        // colorRange.splice(0, 0, "red");
                    } else {
                        colorRange = ["red", "white", "black"];
                    }
                } else {
                    colorRange = ["white", "black"];
                }

                map.update(data, mapType, loadLayers, colorRange);
                updateLegend();
                loadLayers = false;
            })
        }
    }

    function updateLegend() {

        map.makeColorScale(false);
        if (mapType == "SEF") {
            if (SEF_CATEGORICAL.includes(selectedSef)) {

                // Create a color interpolator from black to white
                const interpolateGray = d3.interpolateRgb("white", "black");

                let domain = Object.values(SEF_LEVEL_LABELS[selectedSef]);

                // Generate a grayscale range using interpolation
                const range = domain.map((d, i) => interpolateGray(i / (domain.length - 1)));

                let colorScale = d3.scaleOrdinal()
                    .domain(domain)
                    .range(range)

                map.setColorScale(colorScale);
            }
        }

        legendSvg = map.legend(mapLegend());
        legendDiv.innerHTML = "";
        legendDiv.append(legendSvg)
    }

    function mapLegend() {
        if (mapType == "SEF") {
            return `${SE_FACTORS.filter(d => d.id == selectedSef)[0].label} (${SEF_SCALE(selectedSef)})`;
        } else if (mapType == "Cobenefit") {
            return "Cobenefits (£ per capita)"
        }
    }


    onMount(async () => {
        let fullData;
        if (granularity == "LAD") {
            // fullData = await getTableData(getAverageCBGroupedByLAD(Array.from(coBenefits), scenario, timeSelected))
            fullData = await getTableData(getSUMCBGroupedByLAD(Array.from(coBenefits), "UK", timeSelected))
        } else if (granularity == "LSOA") {
            fullData = await getTableData(getCustomCBData(Array.from(coBenefits), scenario, timeSelected))
        }

        // COnvert from millions to £
        fullData.forEach(d => {
            d.value_per_capita = d.value_per_capita * 1000000
        })


        // map = new MapUK(fullData, granularity, mapDiv, "val", true, "Lookup_Value", true);
        map = new MapUK(fullData, granularity, mapDiv, "value_per_capita", true, "Lookup_Value", true);
        map.initMap();
        map.setTooltipCb(tooltipValue);

        legendSvg = map.legend(mapLegend());
        legendDiv.append(legendSvg)


        // Listen for zoom events: Too slow to do it like this
        // map.map.on('zoom', () => {
        //     const currentZoom = map.map.getZoom();
        //
        //     // console.log("zz ", currentZoom);
        //     if (currentZoom > 8 && map.granularity != "LSOA") {
        //
        //         granularity = "LSOA";
        //         // Zoom level is greater than the threshold, update the layer
        //
        //
        //         // Remove all layers from the map
        //         const layers = map.map.getStyle().layers; // Get all layers in the current map style
        //         if (layers) {
        //             layers.forEach(layer => {
        //                 map.map.removeLayer(layer.id); // Remove each layer by its id
        //             });
        //         }
        //
        //         // Remove all sources from the map
        //         const sources = map.map.getStyle().sources;
        //         for (const sourceId in sources) {
        //             map.map.removeSource(sourceId); // Remove each source by its id
        //         }
        //
        //         map.reset();
        //         // map.dataKey = "total";
        //         map.granularity = "LSOA";
        //         // getTableData(getCustomCBData(Array.from(coBenefits), scenario, timeSelected)).then(data => {
        //         //     map.loadData(data);
        //         //     map.loadLayers();
        //         // })
        //
        //         map.loadData(LSOAData);
        //         map.loadLayers();
        //
        //
        //     } else {
        //         // Zoom level is below or equal to the threshold, revert changes
        //     }
        // });
    })


    const onChangeScenario = (e) => {
        scenario = e.currentTarget.value;
    }
    // const onChangeCobenef = (e) => {
    //     const cobenef: CoBenefit = e.currentTarget.value;
    //
    //     if (coBenefits.size == 0) {
    //         coBenefits = new Set(COBENEFS);
    //     }
    //
    //     if (coBenefits.has(cobenef)) {
    //         coBenefits.delete(cobenef)
    //     } else {
    //         coBenefits.add(cobenef)
    //     }
    //     coBenefits = coBenefits;
    // }

    // radio
    const onChangeCobenef = (e) => {
        const cobenef: CoBenefit = e.currentTarget.value;

        if (cobenef == "total") {
            coBenefits = COBENEFS.map(cb => cb.id);
        } else {
            coBenefits = [cobenef];
        }

        posthog.capture('clicked specific CoBenefit', {
        CoBenefit: e.currentTarget.value
        }) 
    }

    const onChangeTime = (e) => {
        const time = e.currentTarget.value;
        timeSelected = time;
    }

    function changeMap(e, selectedMapType) {
        mapType = e.currentTarget.value;
    }

    const onChangeSEF = (e) => {
        selectedSef = e.currentTarget.value;

        posthog.capture('clicked specific SEF', {
        SEF: e.currentTarget.value
        })  
    }

    const onChangeGranularity = (e) => {
        map.removeLayers();
        map.removeSources();

        granularity = e.currentTarget.value;
        map.granularity = granularity;

        if (granularity == "LSOA") {
            map.border = false
        } else {
            map.border = true;
        }

        loadLayers = true;

        posthog.capture('clicked granularity', {
        granularity: e.currentTarget.value
        })   
    }

    const tooltipValue = (value) => {
        if (mapType == "SEF") {
            if (SEF_CATEGORICAL.includes(selectedSef)) {
                return `Mode value is ${SEF_LEVEL_LABELS[selectedSef][value]}`
            } else {
                return `Mean value is ${value.toFixed(2)}`
            }
        } else if (mapType == "Cobenefit") {
            return `£${value.toFixed(2)} per capita.`
        }
    }

    function exportMap() {
        const canvas = document.getElementsByClassName('maplibregl-canvas')
        const img = canvas[0].toDataURL('image/png')

        var dlLink = document.createElement('a');
        dlLink.download = "map.png";
        dlLink.href = img;
        dlLink.dataset.downloadurl = ['image/png', dlLink.download, dlLink.href].join(':');

        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    }

</script>


<NavigationBar></NavigationBar>

<div class="page-container" bind:this={element}>

    <div class="component" id="heaser">
        <h2> Map </h2>

        <p>This interactive map allows to explore both the co-benefit values (per capita) and the socio-economic factors
            at the local
            authorities and datazones levels. </p>

        <p><strong>Co-Benefits:</strong> The total co-benefit per capita is initially shown. The values go from white
            (low) to black (high), and negative values are shown in red. Individual co-benefit can be selected with the
            radio buttons on the right.</p>
        <p><strong>Socio-Economic Factors:</strong> The average values are shown for numerical factors while the mode is
            shown for categorical factors. Values go from white for low values to black for high values (when values can
            be ordered).</p>

        <!--        <p>-->
        <!--            This interactive map shows the average co-benefit value (in million of £) for each Local Authority (or datazone) of the UK.-->
        <!--            The pathway and time window can be selected,-->
        <!--            along a given set of co-benefits.-->
        <!--        </p>-->
    </div>

    <div id="map-row" class="row">
        <div class="component column" id="mapComp">
            <div id="map" bind:this={mapDiv}>
            </div>
            <div id="map-legend" bind:this={legendDiv}>
            </div>
            <button id="export-button" on:click={exportMap} bind:this={exportButton}>
                Export
            </button>
        </div>

        <div class="component column" id="control-panel">


            <div class="tab">
                <button class="tablinks" class:active={mapType == "Cobenefit"} value="Cobenefit" on:click={changeMap}>
                    CoBenefits
                </button>
                <button class="tablinks" class:active={mapType == "SEF"} value="SEF" on:click={changeMap}>Socio-Economic
                    Factors
                </button>
            </div>


            <div class="component">
                <input type="radio" name="granularity" on:change={onChangeGranularity} value="LAD" checked>
                <label for="LAD">Local Authorities</label>
                <input type="radio" name="granularity" on:change={onChangeGranularity} value="LSOA">
                <label for="LSOA">Data Zones</label>
            </div>


            {#if mapType == "Cobenefit"}
                <div class="tabcontent">
                    <div class="component">

                        <h2> Co-Benefits </h2>
                        {#each COBENEFS.concat({id: "total", label: "Total"}) as coBenef}
                            <div class="checkbox-div">
                                {#if coBenef.id != "total" }
                                    <img alt="cobenefit icon" class="icon" src={getIconFromCobenef(coBenef.id)}/>
                                {:else}
                                    <img style="opacity: 0" class="icon" src={getIconFromCobenef("Air quality")}/>
                                {/if}
                                <input type="radio" on:change={onChangeCobenef} name="cobenef" value={coBenef.id}
                                       checked>
                                <!--                        <input type="checkbox" on:change={onChangeCobenef} name="cobenef" value={coBenef} checked>-->
                                <a class="link" href="{base}/cobenefit?cobenefit={coBenef.id}">
                                    <!--                                    <label>-->
                                    {coBenef.label}
                                    <!--                                    </label>-->
                                </a>
                                <br>
                            </div>
                        {/each}

                    </div>

                    <div class="component">
                        <h2> Time </h2>
                        <div id="time">
                            <label class="time-radio"><input type="radio" name="toggle" value="total"
                                                             on:change={onChangeTime}
                                                             checked><span>Total</span></label>
                            <label class="time-radio"><input type="radio" name="toggle" value="Y2025_2029"
                                                             on:change={onChangeTime}><span>2025-2029</span></label>
                            <label class="time-radio"><input type="radio" name="toggle" value="Y2030_2034"
                                                             on:change={onChangeTime}><span>2030-2034</span></label>
                            <label class="time-radio"><input type="radio" name="toggle" value="Y2035_2039"
                                                             on:change={onChangeTime}><span>2035-2039</span></label>
                            <label class="time-radio"><input type="radio" name="toggle" value="Y2040_2044"
                                                             on:change={onChangeTime}><span>2040-2044</span></label>
                            <label class="time-radio"><input type="radio" name="toggle" value="Y2045_2049"
                                                             on:change={onChangeTime}><span>2045-2049</span></label>
                        </div>
                    </div>
                </div>

            {:else if mapType == "SEF"}

                <div class="tabcontent">

                    <h2> Social Economic Factor </h2>
                    <div id="time">
                        {#each SE_FACTORS as sef}
                            <input type="radio" id="html" name="fav_language" value={sef.id} on:change={onChangeSEF}
                                   checked={sef.id == selectedSef}>
                            <label for="html">{sef.label}</label><br>
                        {/each}
                    </div>
                </div>

            {/if}
        </div>
    </div>

<Footer></Footer>

</div>


<style>

    #mapComp {
        position: relative;
        /*background: #daf4ff;*/
    }

    .page-container {
        height: 100vh;
    }

    #map-row {
        /*height: 1400px;*/
        flex: 1;
    }

    #map {
        width: 100%;
        height: 100%;
        /*flex: 1; !* take the remaining height *!*/
    }

    #map-legend {
        position: absolute;
        width: 25%;
        top: 5%;
        right: 10%;
        padding: 10px;
    }

    #export-button {
        position: absolute;
        top: 15%;
        right: 5%;

        background-color: #007bff;
        /*background-color: black;*/
        cursor: pointer;
        padding: 0.5rem 0.8rem;
        transition: background-color 0.2s ease;
        border-radius: 6px;
        font-size: 1rem;
        color: white;
    }

    #control-panel {
        flex: 0 0 25%; /* Don't grow or shrink, fixed at 75% width */
        display: flex;
        flex-direction: column;
    }

    .time-radio {
        margin: 6px;
        break-inside: avoid;
    }

    #time label span {
        padding: 3px;
        white-space: nowrap;
    }

    /* This hides the html circle radio button */
    #time label input {
        position: absolute;
        top: -20px;
    }

    #time input:checked + span {
        background-color: #0031c3;
        color: #F7F7F7;
    }

    #time .time-radio {
        /*background-color: #FFCC00;*/
        color: #333;
    }

    /* Style the tab */
    .tab {
        overflow: hidden;
        border: 1px solid #ccc;
        background-color: #f1f1f1;
    }

    /* Style the buttons that are used to open the tab content */
    .tab button {
        background-color: inherit;
        float: left;
        border: none;
        outline: none;
        cursor: pointer;
        padding: 14px 16px;
        transition: 0.3s;
    }

    /* Change background color of buttons on hover */
    .tab button:hover {
        background-color: #ddd;
    }

    /* Create an active/current tablink class */
    .tab button.active {
        background-color: #ccc;
    }

    /* Style the tab content */
    .tabcontent {
        padding: 6px 12px;
        border: 1px solid #ccc;
        border-top: none;
    }

    .checkbox-div {
        display: inline;
    }

    .icon {
        height: 2em;
    }
</style>
