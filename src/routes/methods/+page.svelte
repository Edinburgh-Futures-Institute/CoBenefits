<script lang="ts">
    import { base } from '$app/paths';
    import { onMount, tick } from 'svelte';
    import NavigationBar from '$lib/components/NavigationBar.svelte';
    import posthog from 'posthog-js';

    import Footer from "$lib/components/Footer.svelte";

  
    let htmlContent: string = '';

    let container: HTMLDivElement;

    onMount(async () => {
        const res = await fetch(`${base}/methods-doc.html`);
        const rawHtml = await res.text();
        // console.log('rawHtml fetch', `${base}/methods.html`);
        // console.log('rawHtml', rawHtml);

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        // Fix <img src="..."> with base path
        doc.querySelectorAll('img[src]').forEach(img => {
            const src = img.getAttribute('src');
            if (
            src &&
            !src.startsWith('http://') &&
            !src.startsWith('https://') &&
            !src.startsWith('//') &&
            !src.startsWith(base) &&
            !src.startsWith('/')
            ) {
            img.setAttribute('src', `${base}/${src}`);
            }
        });

        // h3 into glossary style
        const h3Sections = Array.from(doc.querySelectorAll('h3'));

        h3Sections.forEach((h3, index) => {
          const sectionWrapper = document.createElement('details');
          if (index === 0) sectionWrapper.setAttribute('open', '');
          const summary = document.createElement('summary');
          summary.textContent = h3.textContent || '';
          sectionWrapper.appendChild(summary);

          let node = h3.nextElementSibling;
          while (
            node &&
            !(node.tagName === 'H3') &&
            !(node.tagName === 'SECTION' && node.id === 'footnotes')
          ) {
            const next = node.nextElementSibling;
            sectionWrapper.appendChild(node); // moves the node
            node = next;
          }

          h3.replaceWith(sectionWrapper);
        });



        htmlContent = doc.body.innerHTML;

        await tick();

        // Tracking opening of Method boxes
        container.addEventListener('click', function(e) {
        const summary = e.target.closest('summary');
        if (summary && summary.parentElement.tagName === 'DETAILS') {
            const details = summary.parentElement;
            const sectionTitle = summary.textContent?.trim() || '';
            
            const willBeOpen = !details.open;
            
            if (willBeOpen) {
                posthog.capture('section opened', {
                    section_name: sectionTitle
                });
            } else {
              posthog.capture('section closed', {
                  section_name: sectionTitle
              });    
            }
            }
        });
          
        if (window.MathJax && typeof window.MathJax.startup?.promise?.then === 'function') {
                await window.MathJax.startup.promise;
                await window.MathJax.typesetPromise([container]);
            }
        });


  </script>
  
  <svelte:head>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      },
      chtml: {
        displayAlign: 'left',
        displayIndent: '0em',
        linebreaks: { automatic: true }
      },
      options: {
        renderActions: {
          addMenu: [] // disable context menu
        }
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
</svelte:head>

  
  <NavigationBar />
  
  <div class="pandoc-html" bind:this={container}>
    {@html htmlContent}
  </div>

<Footer></Footer>
  
<style>

:global(.pandoc-html) {
  width: 1000px;
  margin: auto;
  padding: 1rem;
  font-family: inherit;
  color: inherit;
  line-height: 1.6;
  font-size: 1rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

:global(.pandoc-html ul) {
  padding-left: 1.5rem;
  margin: 1em 0;
  list-style-type: disc;
  line-height: 1.4;
}

:global(.pandoc-html li) {
  margin: 0.25em 0;
}

:global(.pandoc-html li p) {
  margin: 0;
  display: inline;
}

:global(.pandoc-html .mjx-container) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  white-space: normal;
  font-size: 1em !important;
}

:global(.pandoc-html .mjx-mrow) {
  white-space: normal !important;
}

:global(.pandoc-html details) {
  margin-bottom: 10px;
  background-color: #fdfdfd;
  border: 1px solid #f1f1f1;
  border-left: 5px solid rgb(188, 188, 188);
  padding: 0.5em;
  /* border-radius: 4px; */
}

:global(.pandoc-html summary) {
  font-weight: bold;
  font-size: 1.2rem;
  cursor: pointer;
}

:global(.pandoc-html #footnotes) {
  margin-top: 5rem;
}

  </style>
  