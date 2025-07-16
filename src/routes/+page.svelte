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
        type CoBenefit, addSpinner, removeSpinner, buildTimestamp
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

    import {showCoBenefitsDropdown} from '$lib/components/dropdown.js';

    function openDropdown() {
        showCoBenefitsDropdown.set(true);
    }

    const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`
    const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`
    const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`
    let LADToName = {};


    export let data;
    // let LADToName = data.LADToName;

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
        // console.log("aggregationPerBenefit", aggregationPerBenefit);
        // for landing page LAD columns

        aggregationPerCapitaPerBenefit = await getTableData(getAggregationPerCapitaPerBenefit());
        totalAggregation = await getTableData(getTotalAggregation());

        aggregationPerBenefit = [...aggregationPerBenefit].sort((a, b) => b.total - a.total);
        aggregationPerCapitaPerBenefit = [...aggregationPerCapitaPerBenefit].sort((a, b) => b.total_value - a.total_value);
        // console.log("aggregationPerCapitaPerBenefit", aggregationPerCapitaPerBenefit);

        // aggregationPerCapita = totalAggregation[0].total_value_per_capita;
        aggregationPerCapita = d3.sum(aggregationPerCapitaPerBenefit, d => d.value_per_capita)

        // console.log("aggregationPerCapita", aggregationPerCapita);


        maxCoBenefValue = Math.max(...aggregationPerCapitaPerBenefit.map(d => d.total_value));
        minCoBenefValue = Math.min(...aggregationPerCapitaPerBenefit.map(d => d.total_value));
        minHHCoBenefValue = Math.min(...aggregationPerCapitaPerBenefit.map(d => d.value_per_capita));
        maxHHCoBenefValue = Math.max(...aggregationPerCapitaPerBenefit.map(d => d.value_per_capita));

        await csv(LADEngPath).then(data => {
            for (let lad of data) {
                LADToName[lad.LAD22CD] = lad.LAD22NM;
            }
        })
        await csv(LADNIPath).then(data => {
            for (let lad of data) {
                LADToName[lad.LGD2014_code] = lad.LGD2014_name;
            }
        })
        await csv(LADScotlandPath).then(data => {
            for (let lad of data) {
                LADToName[lad.LA_Code] = lad.LA_Name;
            }
        })

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

                // console.log("percentage", type, total, totalValue, percent);

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
        }, 6000);

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
    }

    function renderWaffle(height: number, highlightType?: string) {

        if (!waffleEl) return;

        waffleEl.innerHTML = "";

        let totalSquares = 0;
        const squaresPerUnit = 1;
        const gridWidth = 12;
        const positiveSquares = [];
        const negativeSquares = [];

        for (const item of aggregationPerBenefit) {
            // squareCount: totals squares in the waffle
            const squareCount = Math.round(Math.abs(item.total) / squaresPerUnit);
            totalSquares += squareCount;
            // squareData: make an array for each coben type
            const squareData = Array.from({length: squareCount}, () => ({
                type: item.co_benefit_type,
                negative: item.total < 0
            }));
            // push into pos/neg arrays
            // postiveSquares and negativeSquares: array holding coben types in their sqaure counts
            if (item.total < 0) {
                negativeSquares.push(...squareData);
            } else {
                positiveSquares.push(...squareData);
            }
        }
        const posRows = Math.ceil(positiveSquares.length / gridWidth);
        const negRows = Math.ceil(negativeSquares.length / gridWidth);
        const totalRows = posRows + negRows;
        const unitSize = Math.floor(height / totalRows);

        const posData = positiveSquares.map((d, i) => ({
            x: i % gridWidth,
            y: Math.floor(i / gridWidth),
            ...d
        }));
        const negData = negativeSquares.map((d, i) => ({
            x: i % gridWidth,
            y: posRows + Math.floor(i / gridWidth),
            ...d
        }));

        // coordinates in the waffle: x from 0 to gridWidth, y from 0 to totalRows
        waffleData = [...posData, ...negData];
        // console.log("waffleData", waffleData);

        // text labels for right side axis
        const labelStep = 50;
        const maxLabel = Math.floor(posRows * gridWidth / labelStep) * labelStep;
        const minLabel = -Math.floor(negRows * gridWidth / labelStep) * labelStep;

        const labelsContainer = document.getElementById("waffleLabels");
        if (labelsContainer) {
            labelsContainer.innerHTML = "";

            for (let value = maxLabel; value >= minLabel; value -= labelStep) {
                const offsetSquares = posRows * gridWidth - value;  // squares from top
                const rowIndex = offsetSquares / gridWidth;
                const label = document.createElement("div");
                label.textContent = `${value > 0 ? "+" : ""}${value}bn`;
                label.style.position = "absolute";
                label.style.left = "0";
                const fontSize = Math.max(8, Math.floor(unitSize * 0.6));
                const yPos = rowIndex * unitSize + unitSize / 2 - fontSize / 2 - 15;
                label.style.top = `${yPos}px`;
                label.style.fontSize = `${fontSize}px`;
                label.style.lineHeight = "1";
                labelsContainer.appendChild(label);
            }

            labelsContainer.style.height = `${unitSize * totalRows}px`;
        }

        // for hero backeground sequence
        waffleOrderedTypes = Array.from(
            new Set(waffleData.map(d => d.type).filter(type => type !== "empty"))
        );

        slides = getHeroSlides(waffleOrderedTypes);

        const highlight = highlightType ?? null;
        const plot = Plot.plot({
            width: unitSize * gridWidth * 1.1,
            height: unitSize * totalRows - 30,
            margin: 0,
            marginRight: 35,
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

                Plot.ruleY([posRows * unitSize - 10], {
                    stroke: "grey",
                    strokeWidth: 1.2
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
            waffleBgEl.style.width = `${unitSize * gridWidth + 30}px`;
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
            const topLabelEl = document.getElementById("waffleTopLabel");
            const bottomLabelEl = document.getElementById("waffleBottomLabel");
            const topHeight = topLabelEl?.offsetHeight ?? 0;
            const bottomHeight = bottomLabelEl?.offsetHeight ?? 0;
            const availableHeight = heroHeight - topHeight - bottomHeight;

            renderWaffle(availableHeight);
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

                <span id="waffleTopLabel" class="waffle-text">Co-benefits</span>

                <div bind:this={waffleEl} class="waffle"></div>
                <div id="waffleLabels" class="waffle-chart-labels"></div>

                <span id="waffleBottomLabel" class="waffle-text">Negative impacts</span>
            </div>
    </section>


    <section id="explore-section">

        <div class="explore-header">
            <h1 id="explore-title">Explore the Atlas</h1>
            <div class="explore-block search-section">
                <div class="search-label-and-input">
                    <h1 class="search-label">Find My Place</h1>
                    <div class="search-container">
                        <LADSearch
                                items={LADToName}
                                on:search={(e) => handleSearch(e.detail)}
                        />
                    </div>
                </div>
            </div>
        </div>

        <div id="explore-section-main">

            <div class="explore-block">
                <h2>Browse Report Pages</h2>

                <div class="explore-pages">

                    <div on:click={openDropdown} style="cursor: pointer;">
                        <div class="explore-page">
                            <img src="{base}/pages-teasers/coben.png" alt="Open Co-Benefits Dropdown"/>
                            <h3>11 Co-Benefits Pages</h3>
                            <p> A Co-benefit page shows the spatial and temporal distribution of a given co-benefit, and
                                its relationship with socio-economic factors. </p>
                        </div>
                    </div>


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
                            <h3>Interactive Map</h3>
                            <p> The interactive map enables exploring the spatial distributions of both the co-benefits
                                and the socio-economic factors at the datazones and local area levels.</p>

                        </div>
                    </a>
                </div>
            </div>


            <div class="explore-block story-section">
                <h1>Read Stories and Analyses</h1>
                <hr class="story-teaser-hr">
                <div class="explore-pages story-pages">
                    <a href="/stories/story.pdf" target="_blank" rel="noopener noreferrer">
                        <div class="story">
                            <img class="story-teaser-img" src="{base}/stories/Derry_picture_new.png"/>
                            <h3>Accelerating climate financing in Derry City and Strabane District Council</h3>
                            <hr class="story-teaser-hr">
                        </div>
                    </a>
                </div>

                <div class="explore-pages story-pages">
                    <div class="story">
                        <br>
                        <h3>More to come...</h3>
                        <p>In the mean time, if you have your own ideas for collaboration on stories related to
                            co-benefits please get in touch using the
                            <a href="https://docs.google.com/forms/d/1w-8Lt9bESZ56PdklTIT38plec7dPgDbJtORkatoXFVY/viewform?edit_requested=true">feedback
                                form.</a></p>

                    </div>
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
        padding-top: 0px;
        right: 2rem;
        /* width: 150px;
        height: 150px; */
        pointer-events: none;
        z-index: 10;
        margin: 0;
        align-items: start;
        justify-content: flex-start;
        /* background-color: white; */
    }

    .waffle-text {
        padding-left: 8px;
        font-size: 0.9rem;
        font-style: oblique;
        color: #333;
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

    .waffle-chart-labels {
        position: absolute;
        top: 0;
        left: 82%; /* place it to the right of the waffle */
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        font-size: 10px;
        line-height: 1;
        color: #444;
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
        align-items: flex-start; /* Align to the left */
        justify-content: center;
        padding: 2rem 5rem;
        text-align: left;
    }

    .search-section h1 {
        font-size: 1.5rem;
        margin-bottom: 0rem;
        font-weight: bold;
    }

    .explore-block {
        padding: 0px 15px;
        background-color: #fdfdfd;
        border: 1px solid lightgray;
        flex-grow: 1;
        border-radius: 8px;

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

    .story > h3 {
        /*height: 3.5rem;*/
        font-weight: 400;
        line-height: 24px;
        margin-top: 2px;
        /*background-color: #444;
        color: #fdfdfd;*/
    }

    .explore-page {
        /*border: 1px solid black;*/
        background-color: #fdfdfd;
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
        /*height: 3.5rem;*/
        font-weight: 500;
    }

    .explore-page p {
        margin-top: 0rem;
        padding-bottom: 0;
        color: #333;
        font-weight: 400;
        font-size: 15px;
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
        border-color: #333;
        border-width: 1px;
        object-fit: cover;
        object-position: center;
    }

    .story-teaser-img {
        width: 320px;
        height: auto;
        /*border-top: 2px solid #999;
        border-bottom: 2px solid #999;*/
        object-fit: cover;
        object-position: center;
    }

    .explore-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 5rem;
        flex-wrap: wrap;
    }

    #explore-title {
        margin: 2rem;
    }

    .search-label-and-input {
        display: flex;
        align-items: center;
        gap: 1.75rem;
        max-width: 100%;
    }

    .search-label {
        font-size: 1rem;
        margin: 0rem;
        margin-left: 2rem;
        white-space: nowrap; /* keeps text on one line */
    }

    .search-container {
        width: 600px; /* or any width you prefer */
    }

    .search-container * {
        width: 100%;
        box-sizing: border-box;
    }

    .story-section {
        max-width: 320px; /* image width + padding */
        margin: 0 auto;
    }

    .story-pages {
        justify-content: center;
    }

    .story-teaser-hr {
        width: 100%;
        border: 0;
        border-top: 2px solid #999;
        margin: 1rem 0;
    }
</style>