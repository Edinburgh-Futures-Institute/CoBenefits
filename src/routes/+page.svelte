<script lang="ts">
    import {base} from '$app/paths';
    import {goto} from '$app/navigation';
    import * as Plot from "@observablehq/plot";
    import {onMount, onDestroy} from 'svelte';

    import {
        COBENEFS,
        COBENEFS_RANGE,
        COBENEFS_SCALE,
        getHeroSlides,
        getIconFromCobenef,
        type CoBenefit, addSpinner, removeSpinner
    } from "../globals";

    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import LADSearch from './LADSearch.svelte';
    import CoBenefitTable from './CoBenTable.svelte';
    import LADTable from './LADTable.svelte';

    import total from '$lib/icons/total.png';
    import per_capita from '$lib/icons/per_capita.png';
    import percentage from '$lib/icons/percentage.png';

    // explore by lad: reactive queries
    import {
        getAggregationPerBenefit,
        getAggregationPerCapitaPerBenefit,
        getTopSelectedLADs,
        getTotalAggregation
    } from '$lib/duckdb';
    import {getTableData} from '$lib/duckdb';
    import {csv} from "d3";
    import Footer from "$lib/components/Footer.svelte";
    import * as d3 from "d3";

    // const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`
    // const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`
    // const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`

    // let LADToName = {};


    export let data;
    let LADToName = data.LADToName;

    let element: HTMLElement;

    let aggregationPerBenefit;
    let aggregationPerCapitaPerBenefit;
    let totalAggregation;
    let aggregationPerCapita;
    let maxCoBenefValue;
    let minCoBenefValue;
    let minHHCoBenefValue;
    let maxHHCoBenefValue;
    let dataLoading = true;


    async function loadData() {
        aggregationPerBenefit = await getTableData(getAggregationPerBenefit());
        console.log("aggregationPerBenefit", aggregationPerBenefit);
        // for landing page LAD columns

        aggregationPerCapitaPerBenefit = await getTableData(getAggregationPerCapitaPerBenefit());
        totalAggregation = await getTableData(getTotalAggregation());

        aggregationPerBenefit = [...aggregationPerBenefit].sort((a, b) => b.total - a.total);
        aggregationPerCapitaPerBenefit = [...aggregationPerCapitaPerBenefit].sort((a, b) => b.total_value - a.total_value);
        console.log("aggregationPerCapitaPerBenefit", aggregationPerCapitaPerBenefit);

        // aggregationPerCapita = totalAggregation[0].total_value_per_capita;
        aggregationPerCapita = d3.sum(aggregationPerCapitaPerBenefit, d => d.value_per_capita)

        console.log("aggregationPerCapita", aggregationPerCapita);


        maxCoBenefValue = Math.max(...aggregationPerCapitaPerBenefit.map(d => d.total_value));
        minCoBenefValue = Math.min(...aggregationPerCapitaPerBenefit.map(d => d.total_value));
        minHHCoBenefValue = Math.min(...aggregationPerCapitaPerBenefit.map(d => d.value_per_capita));
        maxHHCoBenefValue = Math.max(...aggregationPerCapitaPerBenefit.map(d => d.value_per_capita));

        // await csv(LADEngPath).then(data => {
        //     for (let lad of data) {
        //         LADToName[lad.LAD22CD] = lad.LAD22NM;
        //     }
        // })
        // await csv(LADNIPath).then(data => {
        //     for (let lad of data) {
        //         LADToName[lad.LGD2014_code] = lad.LGD2014_name;
        //     }
        // })
        // await csv(LADScotlandPath).then(data => {
        //     for (let lad of data) {
        //         LADToName[lad.LA_Code] = lad.LA_Name;
        //     }
        // })

        dataLoading = false;
    }


    // explore by lad: reactive queries
    let ladData = [];
    let region = 'All';
    let sortBy = 'total';
    let maxLADValue = 0;
    let maxHHLADValue = 0;

    // let LADToName = data.LADToName;

    async function fetchLADData() {
        const sql = getTopSelectedLADs({region, sortBy});
        const rows = await getTableData(sql);
        ladData = rows;
        // console.log("ladData", ladData);

        maxLADValue = Math.max(...rows.map(d => d.total_value));
        maxHHLADValue = Math.max(...rows.map(d => d.value_per_capita));
    }

    function handleFilterChange(event) {
        region = event.detail.region;
        sortBy = event.detail.sortBy;
        fetchLADData();
    }

    // for waffle
    let waffleData: [];
    let waffleOrderedTypes: string[] = [];
    let waffleEl: HTMLDivElement | null = null;
    let waffleBgEl: HTMLElement;
    let waffleLabelEl: HTMLElement;
    let activeTypeLabel: string;
    let activeValueLabel: string;
    let activePerCapitaLabel: string = "";
    let activePercentLabel: string;
    let activeIcon: string | null = null;


    // for hero background images
    let slides: any[] = [];
    let heroEl: HTMLElement;
    let highlight: string | null = null;
    // for waffle animation and hero background images
    let activeType: string | null = null;
    let intervalId: any;
    let currentIndex = 0;
    let previousIndex = 0;
    let interval;


    function startWaffleHighlightLoop(height: number) {
        // sort in the waffle display order
        const visibleTypes = waffleData
            .filter(d => d.type !== "empty")
            .map(d => d.type);
        const orderedTypes = Array.from(new Set(visibleTypes));

        // total cobenfits by default
        const totalValue = aggregationPerBenefit.reduce((sum, d) => sum + d.total, 0);

        const highlightSequence = [
            {
                type: null,
                label: 'Total Co-Benefits',
                icon: null,
                // value: totalValue.toFixed(1),
                totalValue: totalValue.toFixed(2),
                perCapitaValue: aggregationPerCapita.toFixed(2),
                percentValue: "100%"
            },
            ...orderedTypes.map((type) => {
                const match = COBENEFS.find(d => d.id === type);
                // const label = type;
                const label = match?.label ?? type;
                let icon = getIconFromCobenef(type as CoBenefit)

                // const value = aggregationPerBenefit.find((d) => d.co_benefit_type === type)?.total.toFixed(3) ?? "";

                const aggregation = aggregationPerBenefit.find(d => d.co_benefit_type === type);
                const perCapita = aggregationPerCapitaPerBenefit.find(d => d.co_benefit_type === type);

                const total = aggregation?.total ?? 0;
                const perCapitaVal = perCapita?.value_per_capita ?? 0;
                const totalFormatted = total.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                const perCapitaFormatted = perCapitaVal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // const percent = totalValue > 0 ? ((total / totalValue) * 100).toFixed(2) + "%" : "0%";
                const percent = totalValue > 0 ? ((total / totalValue) * 100).toFixed(2) : 0;

                console.log("percentage", type, total, totalValue, percent);

                return {
                    type,
                    label,
                    icon,
                    // value,
                    totalValue: totalFormatted,
                    perCapitaValue: perCapitaFormatted,
                    percentValue: percent
                };
            })
        ];

        // refresh 5s for each type
        intervalId = setInterval(() => {
            previousIndex = currentIndex;
            currentIndex = (currentIndex + 1) % highlightSequence.length;
            const {type, label, icon, totalValue, perCapitaValue, percentValue} = highlightSequence[currentIndex];
            activeType = type;
            activeTypeLabel = label;
            activeValueLabel = totalValue;
            activePerCapitaLabel = perCapitaValue;
            activePercentLabel = percentValue;
            activeIcon = icon;

            renderWaffle(height, type);
        }, 5000);

        // On default load, show the total
        // const firstSlide = slides[0];
        const firstSlide = highlightSequence[0];
        activeType = firstSlide.type;
        activeTypeLabel = firstSlide.label;
        // activeValueLabel = totalValue.toFixed(1);
        activeValueLabel = firstSlide.totalValue;
        activePerCapitaLabel = firstSlide.perCapitaValue;
        activePercentLabel = firstSlide.percentValue;
        renderWaffle(height, firstSlide.type);

        console.log("update display", slides)
    }

    function renderWaffle(height: number, highlightType?: string) {

        if (!waffleEl) return;

        waffleEl.innerHTML = "";

        // waffle size
        const unitSize = 20; // fixed size of each square in pixels
        const gridWidth = 15; // fixed number of columns
        const gridHeight = Math.floor(height / unitSize); // number of rows that fit in the hero height
        const gridSize = gridWidth * gridHeight;

        const total = aggregationPerBenefit.reduce((sum, d) => sum + d.total, 0);
        const squares = [];

        // grid sizes
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

        // Sort
        squares.sort((a, b) => {
            // Move 'empty' to the end
            if (a.type === "empty") return 1;
            if (b.type === "empty") return -1;

            // negative values at the end
            if (a.negative && !b.negative) return 1;
            if (!a.negative && b.negative) return -1;

            return 0;
        });

        waffleData = squares.map((d, i) => ({
            x: i % gridWidth,
            y: Math.floor(i / gridWidth),
            ...d
        }));

        // for hero backeground sequence
        waffleOrderedTypes = Array.from(
            new Set(waffleData.map(d => d.type).filter(type => type !== "empty"))
        );

        slides = getHeroSlides(waffleOrderedTypes);

        // console.log("waffle height", height);
        const highlight = highlightType ?? null;
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
                // Postive values
                Plot.rect(waffleData.filter(d => !d.negative), {
                    x: d => d.x * unitSize,
                    y: d => d.y * unitSize,
                    fill: "type",
                    fillOpacity: d => (highlight && d.type !== highlight ? 0.15 : 1)
                }),

                // Outlined rects (negative values)
                Plot.rect(waffleData.filter(d => d.negative), {
                    x: d => d.x * unitSize,
                    y: d => d.y * unitSize,
                    stroke: "type",
                    strokeOpacity: d => (highlight && d.type !== highlight ? 0.15 : 1),
                    strokeWidth: 1,
                    fill: "none"
                })
            ]
        });
        // white background
        if (waffleBgEl) {
            waffleBgEl.style.width = `${unitSize * gridWidth}px`;
            waffleBgEl.style.height = `${height}px`;
        }
        ;

        waffleEl.innerHTML = "";
        waffleEl.append(plot);
    }


    let selectedLAD: string | null = null;

    function handleSearch(code: string) {
        // goto(`${base}/location?location=${code}`);
        window.open(`${base}/location?location=${code}`, '_blank');
    }

    let isLoading = true;

    $: {
        isLoading = !data;
    }

    let showDropdown = false;


    onMount(() => {
        addSpinner(element);

        loadData().then(() => {
            fetchLADData();
            const heroHeight = heroEl.getBoundingClientRect().height;
            renderWaffle(heroHeight);
            startWaffleHighlightLoop(heroHeight);
            removeSpinner(element);
        })
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<!--<div class="page-container" bind:this={element}>-->
<div bind:this={element}>

    <NavigationBar></NavigationBar>

    <section class="hero-container" bind:this={heroEl}>
        {#each slides as slide, index}
            <!-- <div
              class="hero-slide"
              style="background-image: url({slide.image});"
              class:active={index === currentIndex}
              class:previous={index === previousIndex}
            /> -->
            <div
                    class="hero-slide"
                    class:active={index === currentIndex}
                    class:previous={index === previousIndex}
            >
                <img class="slide-image" src={slide.image} alt={slide.label}/>
                <img class="slide-map" src={slide.mapImage} alt="Map overlay"/>
            </div>
        {/each}

        <div class="hero-content">
            <div class="hero-text">
                <img src="{base}/atlas-logos/logo-colored-waffle-png.png" alt="Logo" height="0px"/>
                <h1 class="hero-title">The Co-Benefits of Reaching <br> Net Zero in the UK</h1>
                <p class="hero-description">
                    Climate actions lower greenhouse gas (GHG) emissions but the gains for society reach further. The
                    CO-BENS project models 11 additional benefits based on actions recommended by the Climate Change
                    Committee (CCC) in its Seventh Carbon Budget (2025) across 45,000 communities and regions within the
                    UK.<br>
                </p>
                <p class="hero-description">
                    Explore how, when and for whom benefits emerge to further understand connections between a wide
                    range of
                    social, economic and environmental priorities, and drive more effective decision-making.
                </p>
                <p class="hero-description">
                    To understand more about the analysis or if you would like bespoke co-benefit modelling please get
                    in
                    touch by emailing <a href="mailto:cobens@ed.ac.uk">cobens@ed.ac.uk</a>
                </p>
            </div>

            <div class="waffle-overlay">
                <div class="waffle-label" bind:this={waffleLabelEl}>

                    <div class="waffle-header">
                        {#if activeIcon}
                            <div class="waffle-icon">
                                <img src="{activeIcon}" alt="Icon"/>
                            </div>
                        {/if}
                        <div class="waffle-title">{activeTypeLabel}</div>
                    </div>

                    <div class="waffle-stats">
                        <div class="waffle-stat">
                            <div class="waffle-value-container">
                                <img class="aggregation-icon-small" src="{total}" alt="icon"/>
                                <div class="waffle-value">
                                    <span class="waffle-big">£{activeValueLabel}</span>
                                    <span class="small">billion</span>
                                </div>
                            </div>
                            {#if activeValueLabel > 0}
                                <div class="waffle-caption">National benefits</div>
                            {:else}
                                <div class="waffle-caption">National costs</div>
                            {/if}
                        </div>
                        <div class="waffle-stat">
                            <div class="waffle-value-container">
                                <img class="aggregation-icon-small" src="{per_capita}" alt="icon"/>
                                <div class="waffle-value">
                                    <span class="waffle-big">£{activePerCapitaLabel}</span>
                                    <!-- <span class="small">thousand</span> -->
                                </div>
                            </div>
                            {#if activePerCapitaLabel > 0}
                                <div class="waffle-caption">Per capita benefits</div>
                            {:else}
                                <div class="waffle-caption">Per capita costs</div>
                            {/if}
                        </div>
                        {#if activeType !== null}
                            <div class="waffle-stat">
                                <div class="waffle-value-container">
                                    <img class="aggregation-icon-small" src="{percentage}" alt="icon"/>
                                    <div class="waffle-value">
                                        <span class="waffle-big">{activePercentLabel}</span>
                                        <span class="small">%</span>
                                    </div>
                                </div>
                                <div class="waffle-caption">Contribution</div>
                            </div>
                        {/if}

                    </div>


                </div>

                <div class="waffle-bg" bind:this={waffleBgEl}></div>
                <div bind:this={waffleEl}></div>
            </div>
    </section>


    <section id="explore-section">

        <h1 id="explore-title">Explore the Atlas</h1>
        <div id="explore-section-main">

            <div class="explore-block">
                <h2>Browse Report Pages</h2>

                <div class="explore-pages">

                    <a href="{base}/coben">
                        <div class="explore-page">
                            <img class="page-teaser-img" src="{base}/pages-teasers/coben.png"/>
                            <h3>11 Co-Benefits Pages</h3>
                            <p> A Co-benefit page shows the spatial and temporal distribution of a given co-benefit, and
                                its relationship with socio-economic factors. </p>
                        </div>
                    </a>

                    <a href="{base}/lad">

                        <div class="explore-page">
                            <img class="page-teaser-img" src="{base}/pages-teasers/location.png"/>
                            <h3>382 Local Area Pages</h3>
                            <p> A Local Area page shows the different co-benefits in this area, temporal distributions,
                                and their relationships with local socio-economic distributions.</p>
                        </div>
                    </a>

                    <a href="{base}/sefs">
                        <div class="explore-page">
                            <img class="page-teaser-img" src="{base}/pages-teasers/sef.png"/>
                            <h3>17 Socio-Economic Factors Pages</h3>
                            <p> A Socio-Economic Factor Page shows the spatial distribution of a given factor and it's
                                relationships with the different co-benefits.</p>

                        </div>
                    </a>

                    <a href="{base}/map">
                        <div class="explore-page">
                            <img class="page-teaser-img" src="{base}/pages-teasers/map.png"/>
                            <h3>1 Interactive Map</h3>
                            <p> The interactive map enables exploring the spatial distributions of both the co-benefits
                                and the socio-economic factors at the datazones and local area levels.</p>

                        </div>
                    </a>
                </div>
            </div>

            <div class="explore-block search-section">
                <h1>Find My Place</h1>
                <LADSearch
                        items={LADToName}
                        on:search={(e) => handleSearch(e.detail)}
                />
            </div>

            <div class="explore-block">
                <h1>Read Stories and Analyses</h1>

                <div class="explore-pages">
                    <a href="{base}/stories/Derry_story.docx" download="story">
                        <div class="story">
                            <img class="story-teaser-img" src="{base}/stories/Derry_picture.png"/>
                            <h3>Accelerating climate financing in Derry City and Strabane District Council</h3>
                            <!--                        <p> A Co-benefit page shows the spatial and temporal distribution of a given co-benefit, and its relationship with socio-economic factors. </p>-->
                        </div>
                    </a>
                </div>

            </div>

        </div>


    </section>

    <!--    <section class="search-section">-->
    <!--        <h1>Find My Place</h1>-->
    <!--        <LADSearch-->
    <!--            items={LADToName}-->
    <!--            on:search={(e) => handleSearch(e.detail)}-->
    <!--        />-->
    <!--        &lt;!&ndash; {#if selectedLAD}-->
    <!--          <h2>Total Cobenefits</h2>-->
    <!--          <h2>Cobenefits Over Time</h2>-->

    <!--        {/if} &ndash;&gt;-->
    <!--    </section>-->


    <section class="side-by-side-section">
        <div class="side-box">
            <h2>Explore by Local Authority</h2>
            <p>Click to see local authority data report.</p>

            {#if !dataLoading}
                <LADTable
                        {ladData}
                        {region}
                        {sortBy}
                        {maxLADValue}
                        {maxHHLADValue}
                        {LADToName}
                        on:filterChange={handleFilterChange}
                />
            {/if}
        </div>

        <div class="side-box">
            <h2>Explore by Co-Benefit</h2>
            <p>Click to see each co-benefit data report.</p>
            {#if !dataLoading}
                <CoBenefitTable
                        {aggregationPerCapitaPerBenefit}
                        {minCoBenefValue}
                        {maxCoBenefValue}
                        {minHHCoBenefValue}
                        {maxHHCoBenefValue}
                        {COBENEFS_SCALE}
                />
            {/if}
        </div>

    </section>

    <Footer></Footer>

</div>


<style>
    main {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 60%;
    }

    .hero-text {
        position: relative;
        z-index: 1;
        max-width: 700px;
    }

    .hero-title {
        font-size: 2.75rem;
        font-weight: bold;
        margin-bottom: 3rem;
        margin-top: -1rem;
        line-height: 3rem;
    }

    .hero-description {
        /* font-size: 0.8rem; */
        font-size: 0.9rem;
        margin-bottom: 0.2rem;
        /* line-height: 1rem; */
        /* max-width: 620px; */
        max-width: 500px;
    }


    .hero-container {
        position: relative;
        height: 55vh;
        overflow: hidden;
    }

    .hero-slide {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: opacity 1.2s ease-in-out;
        z-index: 0;
    }

    .hero-slide.active {
        opacity: 1;
        z-index: 1;
    }

    .hero-slide.previous {
        z-index: 0;
    }

    .slide-map {
        position: absolute;
        /* width: 100%; */
        height: 100%;
        object-fit: cover;
        top: 0;
        left: 25%;
    }

    .slide-map {
        z-index: 2;
    }

    .hero-content {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0 2rem;
        color: #000;
    }

    .waffle-overlay {
        position: absolute;
        top: 0;
        right: 0.5rem;
        /* width: 150px;
        height: 150px; */
        pointer-events: none;
        z-index: 10;
        margin: 0;
        align-items: start;
        justify-content: flex-start;
        /* background-color: white; */
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
        padding: 1.5rem 1.2rem;
        width: 200px;
        font-size: 0.95rem;
        line-height: 1.4;
        z-index: 2;
        color: #000;
        background-color: rgba(255, 255, 255, 0.2);
        /* box-shadow: 0 4px 8px rgba(0,0,0,0.2); */
        text-align: left;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        border-radius: 12px;
    }

    .waffle-header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .waffle-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .waffle-icon img {
        width: 48px;
        height: 48px;
    }

    .waffle-title {
        font-size: 1.5rem;
        line-height: 1.75rem;
        font-weight: bold;
        color: #111;
        text-align: left;
    }

    .waffle-stats {
        display: flex;
        flex-direction: column;
        gap: 1rem;
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
    }

    .side-by-side-section {
        display: flex;
        gap: 2rem;
        padding: 2rem 3rem;
        justify-content: space-between;
        background-color: #f9f9f9;
    }

    #explore-section {
        padding: 0 2rem;
    }

    #explore-title {
        font-size: 32px;
        margin: 1rem 0;
    }

    #explore-section-main {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        /*padding: 2rem 3rem;*/
        /*padding-right: 1.5rem;*/
        /*padding-left: 1.5rem;*/
        justify-content: space-between;
        /*background-color: #f9f9f9;*/
    }

    .side-box {
        flex: 1;
        background-color: #fff;
        border: 1px solid #ddd;
        padding: 1.5rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
    }


    .side-box h2 {
        margin-bottom: 0rem;
        padding-bottom: 0;
        font-size: 1.5rem;
        color: #333;
    }

    .side-box p {
        margin-top: 0rem;
        padding-bottom: 0;
        color: #333;
    }


    .side-by-side-section {
        display: flex;
        gap: 2rem;
        margin-top: 2rem;
    }

    .search-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        text-align: center;
    }

    .search-section h1 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        font-weight: bold;
    }

    .explore-block {
        padding: 10px;
        background-color: #f9f9f9;
        border: 1px solid lightgray;
        flex-grow: 1;

    }


    .aggregation-icon-small {
        width: 30px;
        height: 30px;
    }

    .waffle-value-container {
        display: flex;
        align-items: center;
        gap: 8px; /* space between icon and number */
    }


    .explore-pages {
        display: flex;
        justify-content: space-evenly;
        gap: 2%;
    }

    .explore-page {
        /*border: 1px solid black;*/
        background-color: #f9f9f9;
        max-width: 14rem;
        /*margin-right: 1rem;*/
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        /*justify-content: flex-end;*/
        /*height: 100%;*/
    }

    /* Need fixed height so text afterwards starts at same y position*/
    .explore-page > h3 {
        height: 3.5rem;
    }

    .explore-page > p {
        /*margin-top: auto;*/
        /*height: 25%;*/
        /*height: 1000px;*/
    }

    .explore-pages a {
        color: black;

    }

    .page-teaser-img {
        width: 100%;
        height: 300px;

        object-fit: cover;
        object-position: center;
    }

    .story-teaser-img {
        width: 100%;

        object-fit: cover;
        object-position: center;
    }

</style>