<script lang="ts">
    import { base } from '$app/paths';
    import * as Plot from "@observablehq/plot";

    export let aggregationPerCapitaPerBenefit;
    export let minCoBenefValue;
    export let maxCoBenefValue;
    export let minHHCoBenefValue;
    export let maxHHCoBenefValue;
    export let COBENEFS_SCALE;
    import { COBENEFS, getIconFromCobenef } from "../globals";

    function getCoBenefLabel(id: string): string {
        return COBENEFS.find(d => d.id === id)?.label ?? id;
        }

  
    let viewMode = 'total';

    // bars for coben table
    function makeCoBenefBarSVG(value, minAbs, maxAbs, coBenefType, colorScale) {
    const color = colorScale(coBenefType);

    const plot = Plot.plot({
        width: 100,
        height: 20,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        x: { domain: [minAbs, maxAbs], axis: null }, //for negative values
        marks: [
        Plot.ruleX([0], { stroke: "#3C3C3C" }), // baseline
        Plot.barX([value], {
            x: d => d,
            y: 0,
            fill: color
        })
        ]
    });
    return plot.outerHTML;
    }
</script>
  

<div class="controls">
    <div class="button-group">
        <button
          class:selected={viewMode === 'total'}
          on:click={() => viewMode = 'total'}>
          Total
        </button>
      
        <button
          class:selected={viewMode === 'per_capita'}
          on:click={() => viewMode = 'per_capita'}>
          Per Capita
        </button>
    </div>
</div>

<table class="data-table">
    <thead>
        <tr>
            <th>Name</th>
            <th style="width: 180px;">{viewMode === 'total' ? 'Total' : 'Per Capita'}</th>
            <th style="width: 80px;">{viewMode === 'total' ? '£, billion' : '£'}</th>
        </tr>
    </thead>
    <tbody>
    {#each aggregationPerCapitaPerBenefit as coBenef}
        <tr>
        <td>
            <div class="coben-content">
              <img src={getIconFromCobenef(coBenef.co_benefit_type)} alt="Icon" class="in-table-icon" />
              <a href="{base}/cobenefit?cobenefit={coBenef.co_benefit_type}" target="_blank">
                {getCoBenefLabel(coBenef.co_benefit_type)}
              </a>
            </div>
          </td>
          
        <td>
            <div class="bar-cell">
              {#key viewMode}
                {@html viewMode === 'total'
                  ? makeCoBenefBarSVG(coBenef.total_value, minCoBenefValue, maxCoBenefValue, coBenef.co_benefit_type, COBENEFS_SCALE)
                  : makeCoBenefBarSVG(coBenef.value_per_capita, minHHCoBenefValue, maxHHCoBenefValue, coBenef.co_benefit_type, COBENEFS_SCALE)
                }
              {/key}
            </div>
        </td>
        <td>
            {#if viewMode === 'total'}
                <span>{coBenef.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {:else}
                <span>{coBenef.value_per_capita.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {/if}
        </td>
        </tr>
    {/each}
    </tbody>
</table>


<style>
    
</style>