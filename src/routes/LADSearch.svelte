<script lang="ts">
import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ select: string; search: string }>();

  export let items: Record<string, string>;
  let term = '';
  let selectedCode: string | null = null;
  // const codes = Object.entries(items);
  $: codes = Object.entries(items);

  $: suggestions = term
    ? codes
        .filter(([_, name]) =>
          name.toLowerCase().includes(term.toLowerCase())
        )
        .slice(0, 10)
    : [];

  function pick([code, name]: [string, string]) {
    term = name;
    selectedCode = code;
    dispatch('select', code);
    console.log(`Selected code: ${code}`, `Name: ${name}`);
  }

  function doSearch() {
    if (selectedCode) {
      dispatch('search', selectedCode);
    }
  }

  //  $: console.log('suggestions:', suggestions);
  </script>
  
  <div class="autocomplete">
    <div class="input-group">
        <input
          type="text"
          bind:value={term}
          placeholder="Type local authority name to search..."
          autocomplete="off"
        />
        <button
          type="button"
          class="search-btn"
          on:click={doSearch}
          disabled={!selectedCode}
        >
          See Report
        </button>
      </div>
    
      {#if suggestions.length}
        <ul class="suggestions">
          {#each suggestions as entry}
            <li on:click={() => pick(entry)}>{entry[1]}</li>
          {/each}
        </ul>
      {/if}
  </div>
  

  <style>
.autocomplete {
  width: 100%;
  max-width: 500px;
  margin: 1rem auto;
  position: relative;
  font-family: sans-serif;
}


  .input-group {
  display: flex;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
  overflow: hidden;
  background-color: #fff;
}

.input-group input[type="text"] {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: none;
  outline: none;
}

input {
width: 100%;
font-size: 1rem;
padding: 0.5rem 0.75rem;
/* border: 1px solid #ccc; */
border-radius: 0.5rem;
/* box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1); */
transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus {
outline: none;
border-color: #0070f3;
box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.3);
}

.search-btn {
padding: 0.5rem 1rem;
font-size: 1rem;
border: none;
background-color: #007bff;
border-radius: 6px;
color: white;
cursor: pointer;
transition: background-color 0.2s ease;
}

.search-btn:hover {
  background-color: #0056b3;
}

.search-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

  .suggestions {
    position: absolute;
    z-index: 10;
    width: 100%;
    background: #fff;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 0.5rem 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .suggestions li {
    padding: 0.75rem 1rem;
    cursor: pointer;
  }

  .suggestions li:hover {
    background: #f5f5f5;
  }
  </style>

