<script>
	import { createEventDispatcher } from 'svelte';
	
	export let showModal = false;
	export let header = '';
	
	let dialog; // HTMLDialogElement
	const dispatch = createEventDispatcher();
	
	$: if (dialog && showModal) {
	  dialog.showModal();
	}
	
	$: if (dialog) {
		if (showModal) {
			dialog.showModal();
		} else {
			dialog.close(); // This line was missing
		}
		}
		
	function closeModal() {
	  showModal = false;
	  dispatch('close');
	}
	
	function handleBackdropClick(e) {
	  if (e.target === dialog) {
		closeModal();
	  }
	}
  </script>
  
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <dialog
	bind:this={dialog}
	on:close={closeModal}
	on:click={handleBackdropClick}
  >
	<div>
	  {#if header}
		<h2>{header}</h2>
		<hr />
	  {/if}
	  
	  <slot></slot>
	</div>
  </dialog>
  
  <style>
	dialog {
	  max-width: 32em;
	  border-radius: 0.2em;
	  border: none;
	  padding: 0;
	}
	dialog::backdrop {
	  background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
	  padding: 1em;
	}
	dialog[open] {
	  animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
	  from { transform: scale(0.95); }
	  to { transform: scale(1); }
	}
	dialog[open]::backdrop {
	  animation: fade 0.2s ease-out;
	}
	@keyframes fade {
	  from { opacity: 0; }
	  to { opacity: 1; }
	}
  </style>