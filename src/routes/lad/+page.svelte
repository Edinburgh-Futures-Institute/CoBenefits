<script lang="ts">
    import {base} from "$app/paths";
    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {getTableData, getLADRegion} from '$lib/duckdb'
    import {csv} from "d3";
    import {onMount} from "svelte";

    import Footer from "$lib/components/Footer.svelte";


    const LADEngPath = `${base}/LAD/Eng_Wales_LSOA_LADs.csv`
    const LADNIPath = `${base}/LAD/NI_DZ_LAD.csv`
    const LADScotlandPath = `${base}/LAD/Scotland_DZ_LA.csv`

    let LADToName = {};
    let LADToNation = {};
    let entries = [];
    let grouped = {};
    let nations = ["England", "Northern Ireland", "Scotland", "Wales"];

    const nationMap = {
        "NI": "Northern Ireland",
        "England": "England",
        "Wales": "Wales",
        "Scotland": "Scotland"
    };

    async function loadData() {
        const eng = await csv(LADEngPath);
        for (let lad of eng) {
            LADToName[lad.LAD22CD] = lad.LAD22NM;
        }

        const ni = await csv(LADNIPath);
        for (let lad of ni) {
            LADToName[lad.LGD2014_code] = lad.LGD2014_name;
        }

        const sco = await csv(LADScotlandPath);
        for (let lad of sco) {
            LADToName[lad.LA_Code] = lad.LA_Name;
        }

        const LADRegion = await getTableData(getLADRegion());

        for (let row of LADRegion) {
            const nation = nationMap[row.Nation] || row.Nation;
            LADToNation[row.LAD] = nation;
        }

        entries = Object.entries(LADToName).map(([code, name]) => ({
            code,
            name,
            nation: LADToNation[code]
        }));

        grouped = {};
        for (let nation of nations) {
            grouped[nation] = entries
                .filter(entry => entry.nation === nation)
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    onMount(async () => {
        await loadData();
    });

</script>

<NavigationBar/>

{#if entries.length === 0}
    <p>Loading local authorities…</p>
{:else}
    <main>
        <h1>Browse by nation</h1>
        <p>Click on a nation for a detailed report.</p>
        <div class="sef-link-wrapper"> 
            <a class="sef-link" href="{base}/nation?nation=England">England</a> 
        </div>
        <div class="sef-link-wrapper"> 
            <a class="sef-link" href="{base}/nation?nation=NI">Northern Ireland</a> 
        </div>
        <div class="sef-link-wrapper"> 
            <a class="sef-link" href="{base}/nation?nation=Scotland">Scotland</a> 
        </div>
        <div class="sef-link-wrapper"> 
            <a class="sef-link" href="{base}/nation?nation=Wales">Wales</a> 
        </div>
        <br>
        <br>
        <h1>Browse by local authority</h1>
        <p>Open the tabs and then click on a local authority for a detailed report.</p>
        {#each nations as nation}
            <details>
                <summary>

                    <!-- TODO: the number of England LAD is uncorrect currently -->
                    {#if nation == "England"}
                        <p>{nation} (317) </p>
                            <!-- <span class="small-text">Click <a class="nation-link" href="{base}/nation?nation={nation}" target="_blank">here</a> for the England report page</span> -->
                    {:else}
                        <p>{nation} ({grouped[nation].length}) </p>
                            <!--<span class="small-text">Click <a class="nation-link" href="{base}/nation?nation={nation}" target="_blank">here</a> for the {nation} report page</span></p>-->
                    {/if}


                </summary>
                <div class="lad-grid">
                    
                    {#each grouped[nation] as lad}
                    
                        <a class="lad-link" href="{base}/location?location={lad.code}">{lad.name}</a>
                    {/each}
                </div>
            </details>
        {/each}
    </main>
{/if}

<Footer></Footer>
<style>
    main {
        padding: 2rem 4rem;
        font-family: Arial, sans-serif;
    }
    p {
        font-size: 1em;
        line-height: 1.6;
    }

    section {
        margin: 2em 0;
    }

    h2 {
        font-size: 1.5em;
        margin-bottom: 0.5em;
        margin-top: 2em;
    }

    details {
        margin: 1em 0;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        background-color: #fff;
    }

    summary {
        font-size: 1.1em;
        font-weight: 600;
        padding: 0em 1em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ddd;
        transition: background-color 0.2s ease;
    }

    summary:hover {
        background-color: #eee;
    }

    summary::marker,
    summary::-webkit-details-marker {
        display: none;
    }

    summary::after {
        content: "▶";
        font-size: 0.9em;
        transform: rotate(0deg);
        transition: transform 0.2s ease;
    }

    details[open] summary::after {
        transform: rotate(90deg);
    }

    .lad-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 0.75em;
        padding: 1em;
    }

    .lad-link {
        text-decoration: none;
        color: #1a73e8;
        font-weight: 500;
        display: block;
    }

    .nation-link {
        text-decoration: none;
        color: #1a73e8;
        font-weight: 600;
        text-decoration: underline;
        
    }

    .lad-link:hover {
        text-decoration: underline;
        color: #155ab6;
    }

    .small-text {
        font-size: 0.9em;
        display: inline;
        margin-left: 4px;
        color: #333;
     }

    .sef-link-wrapper {
        display: inline-flex; 
        align-items: center;
        gap: 0.5rem; 
        background: #F8F8F8;
        border: 1px solid #ECECEC;
        border-radius: 5px;
        padding-left: 1%;
        padding-right: 1%;
        padding-top: 0.5%;
        padding-bottom: 0.5%;
        margin: 5px 5px;
    }
    .sef-link-wrapper:hover {
        background: #404040;
}
    .sef-link {
        text-decoration: none;
        color: #333;
        font-weight: 500;
        display: block;
        font-size: 1.2em;
    }
    .sef-link:hover {
    color: #F8F8F8;
    background: #404040
}
.sef-link-wrapper:hover .sef-link {
    color: #F8F8F8;
}
</style>