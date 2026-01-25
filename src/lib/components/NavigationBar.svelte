<script lang="ts">
import {base} from "$app/paths";
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { showCoBenefitsDropdown } from '$lib/components/dropdown.js';

import {COBENEFS, COBENEFS_SCALE} from "../../globals";

let showDropdown = false;
let showDropdownContact = false;


async function goToSection(id: string) {
    const currentPath = get(page).url.pathname;

    if (currentPath === '/contact') {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      await goto(`/contact#${id}`);
    }
  }

</script>


<nav class="navbar">
    <div class="nav-left">
      <!-- <img src="{base}/atlas-logos/logo-colored-waffle.png" alt="Logo" class="logo" /> -->
      <!-- <img src="{base}/atlas-logos/logo-beta.png" alt="Logo" class="logo" /> -->
      <a href="{base}/" class="nav-item" class:active={$page.url.pathname === `${base}`}>
        <img src="{base}/atlas-logos/logo_new.png" alt="Logo" class="logo" />
      </a>           
    </div>

    <div class="nav-center">
<div
  class="dropdown nav-item"
  on:mouseenter={() => showCoBenefitsDropdown.set(true)}
  on:mouseleave={() => showCoBenefitsDropdown.set(false)}
>
  <div class="nav-count">11</div>
  <span
    class="dropdown-label"
    class:active={$page.url.pathname.startsWith(`${base}/cobenefit`)}
  >
    Co-Benefits
  </span>

  {#if $showCoBenefitsDropdown}
    <ul class="dropdown-menu">
      {#each COBENEFS as coBenef}
        <li>
          <a
            href="{base}/cobenefit?cobenefit={coBenef.id}"
            data-sveltekit-reload
            style="--cobenef-color: {COBENEFS_SCALE(coBenef.id)}"
            class:selected={$page.url.searchParams.get('cobenefit') === coBenef.id}
          >
            {coBenef.label}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

      <div class="nav-item">
        <div class="nav-count">382</div>
        
        <a href="{base}/lad" class:active={$page.url.pathname === `${base}/lad`}>Local Authorities</a>
      </div>

      <div class="nav-item">
        <div class="nav-count">17</div>
        <!-- <a>Households</a> -->
        <a href="{base}/sefs" class:active={$page.url.pathname === `${base}/sefs`}>Socio-Economic Factors</a>
      </div>

      <div class="nav-item">
        <div class="nav-count">46,426</div>
        <a href="{base}/map" class:active={$page.url.pathname === `${base}/map`} target="_blank">Data Zones</a>
      </div>

      <!-- EXPERIMENTAL -->
      <!-- <div class="nav-item">
        <a href="{base}/playground" class="playground-pill" class:active={$page.url.pathname === `${base}/playground`}>
          Playground
        </a>
      </div> -->
    </div>

    <div class="nav-right" style="gap: 1rem;">
      <a href="{base}/" class="nav-item" class:active={$page.url.pathname === `${base}`}>Home</a>
      <a href="{base}/methods" class="nav-item" class:active={$page.url.pathname === `${base}/methods`}>Methods</a>
      <a href="{base}/methods" class="nav-item" class:active={$page.url.pathname === `${base}/methods`}>Community</a>
      <!-- <a href="mailto:cobens@ed.ac.uk" class="nav-item">Contact</a> -->
      <div class="dropdown nav-item" style="margin-top: 0;"
          on:mouseenter={() => (showDropdownContact = true)}
          on:mouseleave={() => (showDropdownContact = false)}
          >
        <a href="{base}/contact" class="nav-item">Contact</a>
        {#if showDropdownContact}
          <ul class="dropdown-menu" style="min-width: 150px;">
              <li><a href="{base}/contact" on:click|preventDefault={() => goToSection("feedback")}>Feedback</a></li>
              <li><a href="{base}/contact" on:click|preventDefault={() => goToSection("email")}>Email</a></li>
              <li><a href="{base}/contact" on:click|preventDefault={() => goToSection("newsletter")}>Newsletter</a></li>
              <li><a href="{base}/contact" on:click|preventDefault={() => goToSection("training")}>Training</a></li>
          </ul>
        {/if}
      </div>
      <a href="{base}/about" class="nav-item" class:active={$page.url.pathname === `${base}/about`}>About</a>
    </div>
  </nav>


<style>

  .navbar {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: space-between;
    height: 65px;
    background-color: #fff;
    z-index: 1000;
    padding-bottom: 4px;
    padding-right: 15px;
    border-bottom: 1px solid #ddd;
  }

  /* EXPERIMENTAL */
  .playground-pill {
    background: #ff4fd8;
    color: #ffffff !important;
    border: 1px solid #ff1fc9;
    border-radius: 999px;
    padding: 7px 10px;
    font-weight: 800;
    line-height: 1;
    box-shadow: 0 1px 0 rgba(17, 24, 39, 0.06);
  }

  .playground-pill:hover {
    filter: brightness(1.02);
  }

  /* .nav-left {
    height: 100%;
    display: flex;
    align-items: center;
  } */

  .nav-left,
  .nav-center,
  .nav-right {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-left {
    flex: 1;
    max-width: 250px;
  }

  .nav-center {
    flex: 2;
    justify-content: center;
  }

  .nav-right {
    flex: 1;
    justify-content: flex-end;
  }

  .logo {
    height: 60px;
    max-height: auto;
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 10px;
  }

  /* .nav-right {
    display: flex;
    gap: 2rem;
    align-items: flex-end;
    padding-bottom: 0.4rem;
    margin-right: 2rem;
  } */

  .nav-item {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .nav-item.inactive a {
    cursor: not-allowed;
  }

  .nav-item.inactive a:hover {
    color: #999;
    border-bottom: 3px solid transparent;
  }


  .nav-count {
  font-size: 1em;
  color: #555;
  margin-bottom: 2px;
  line-height: 1;
  text-align: center;
  width: 100%;
  font-weight: 1000;
}

  .dropdown {
    position: relative;
    display: block;
    padding-bottom: 0;
    margin-bottom: 0;
  }


  .nav-right a,
  .nav-center a,
  .dropdown-label {
    display: inline-block;
    text-decoration: none;
    color: #333;
    cursor: pointer;
    font-weight: 500;
    position: relative;
    padding-bottom: 4px;
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    /* text-decoration: underline; */
  }

  .nav-center a:hover,
  .nav-right a:hover {
    color: #0077cc;
    border-bottom: 3px solid #0077cc;
  }

  .nav-right a.active,
  .nav-center a.active {
    color: #0077cc;
    border-bottom: 3px solid #0077cc;
  }

  .nav-center .dropdown-menu a:hover,
  .nav-center .dropdown-menu a.selected {
    color: var(--cobenef-color) !important;
    border-bottom: 3px solid var(--cobenef-color) !important;
  }
 

  .dropdown {
    position: relative;
    align-items: center;
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .dropdown-menu {
    min-width: 180px;
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 220px;
    background: white;
    border: 1px solid #636363;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    list-style: none;
    padding: 0.5rem 0;
    margin: 0;
    z-index: 1001;
  }

  .dropdown-menu li {
    padding: 0.25rem 1rem;
  }

  .dropdown-menu li a {
    color: #333;
    text-decoration: none;
  }

  .dropdown-menu li a:hover {
    color: #0077cc;
  }


  @media (max-width: 768px) {
    .navbar {
      flex-direction: column;
      align-items: stretch;
      height: auto;
    }

    .nav-left,
    .nav-center,
    .nav-right {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.5rem 0;
      /* min-width: 0 */
    }

    .dropdown-menu {
      position: static;
      box-shadow: none;
      border: none;
    }
}

</style>