<script lang="ts">
    import { base } from "$app/paths";
    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import {getTableData, getLADRegion} from '$lib/duckdb'
    import { csv } from "d3";
    import { onMount } from "svelte";

    import PeopleIcon from '$lib/icons/People.png';
    import CarIcon from '$lib/icons/Car.png';
    import HouseIcon from '$lib/icons/Exterior.png';
    import TreeIcon from '$lib/icons/Forest.png';
    import Footer from "$lib/components/Footer.svelte";

    onMount(async () => {
        await loadData();
    });

</script>   

<NavigationBar />

<main>
    <h1 class="page-title">Browse socio-economic factors</h1>
    <!--<div class="disclaimer-box">
    <p style="margin: 0 0 0rem 0;"><strong>What are socio-economic factors?:</strong> ...</p>
    </div>-->
    <p class='description'>
        <strong>Socio-economic factors</strong> in the context of co-benefits refer to the social and economic conditions that influence how different populations may be affected by climate action.
        Exploring the socio-economic factors help determine:

    <ul class='definition spaced-list'>
            <li><strong>Who benefits most or least</strong> (e.g., low-income vs. high-income groups)</li>
            <li><strong>How benefits/costs are distributed</strong> </li>
            <li><strong>Whether existing inequalities are reduced or reinforced</strong></li>
          </ul>
<hr>
<br>
    <h3 class="component-title"> Click on a socio-economic factor for a detailed report:</h3>
</main>

<main class="main-container">
    <div class="left-column">
        <div class="heading-container">
            <img src={PeopleIcon} alt="Icon" class="heading-icon" />
            <h2 class="page-title">Demographics</h2>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Under_35">Age - under 35 </a>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Over_65">Age - over 65</a>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Median_Income">Income</a>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Unemployment">Unemployment</a>
        </div>

        <div class="heading-container">
            <img src={CarIcon} alt="Icon" class="heading-icon" />
            <h2 class="page-title">Transport</h2>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Number_cars">Number of cars</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Urban_trips">Number of urban trips</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Total_vkm">Car travel</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Urban_vkm">Urban car travel</a>
    </div>
    </div>
    
    <div class="right-column">
        <div class="heading-container">
            <img src={HouseIcon} alt="Icon" class="heading-icon" />
            <h2 class="page-title">Building factors</h2>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=EPC">Domestic energy performance certificate (EPC)</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Tenure">Housing tenure</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Typology">Building type</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Fuel_Type">Domestic fuel type</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Gas_flag">Gas grid connection</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=House_value">House value</a>
    </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Fuel_consumption_total">Annual fuel consumption</a>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Floor_area">Floor area</a>
        </div>


        <div class="heading-container">
            <img src={TreeIcon} alt="Icon" class="heading-icon" />
            <h2 class="page-title">Geography</h2>
        </div>
        <div class="sef-link-wrapper">
        <a class="sef-link" href="{base}/sef?sef=Rurality">Rurality</a>
        </div>
    </div>
</main>


<style>
    main {
        padding: 2rem 4rem 0rem 4rem; 
        font-family: Arial, sans-serif;
    }

    .main-container {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        padding: 0rem 4rem 0rem 4rem; 
    }
    .left-column,
    .right-column {
        flex: 1;
    }
            
    h2 {
        font-size: 1.5em;
        margin-bottom: 0.3em;
        margin-top: 1em;
    }
    .sef-link {
        text-decoration: none;
        color: #5A5A5A;
        font-weight: 500;
        display: block;
        font-size: 1.2em;
    }
    .sef-link:hover {
    color: #F8F8F8;
    background: #404040
}
    .heading-container {
        display: flex;
        align-items: center;
        gap: 0.8rem; 
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
    }
    .heading-icon {
        width: 40px; 
        height: 40px;
        margin-bottom: -0.5rem; 
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
    .sef-link-wrapper:hover .sef-link {
    color: #F8F8F8;
    }
.disclaimer-box {
    margin-bottom: 0rem;
    padding: 0.5rem;
    border-left: 4px solid #ccc;
    font-size: 0.9rem;
    color: #555;
}

.definition li {
  font-size: 0.9rem; 
}

.spaced-list {
  margin-top: 0.5em; 
  margin-bottom: 2em;;
}

</style>