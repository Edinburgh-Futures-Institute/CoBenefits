<script lang="ts">
    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import { base } from "$app/paths";
    import Modal from "$lib/components/Modal.svelte"
    import posthog from "posthog-js";
  
    const CONSENT_KEY = 'cookie-consent';
    const CONTACT_CONSENT_KEY = 'contact-consent';
    const USER_EMAIL_KEY = 'user-email';
    
    let trackingDisabled = localStorage.getItem('cookie-consent') === 'rejected';
    let showModal = false;
    let showDeleteConfirmationModal = false;
    let showDeleteEmailModal = false;
    let userEmail = '';
    let hasContactConsent = localStorage.getItem(CONTACT_CONSENT_KEY) === 'true';
    let savedEmail = localStorage.getItem(USER_EMAIL_KEY) || '';
    
    function submitContactInfo() {
      
      localStorage.setItem(CONTACT_CONSENT_KEY, 'true');
      localStorage.setItem(USER_EMAIL_KEY, userEmail);
      
      hasContactConsent = true;
      savedEmail = userEmail;
      
      posthog.identify(userEmail, {
        email: userEmail,
      });
    }
    
    function removeContactConsent() {
      localStorage.removeItem(CONTACT_CONSENT_KEY);
      localStorage.removeItem(USER_EMAIL_KEY);
      hasContactConsent = false;
      savedEmail = '';
      userEmail = '';
      showDeleteEmailModal = true;
      posthog.reset(); 
    }
    
    function enableTracking() {
      posthog.opt_in_capturing();
      localStorage.setItem('cookie-consent', 'accepted');
      trackingDisabled = false;
      
      // Re-identify user if they have contact consent
      if (hasContactConsent && savedEmail) {
        posthog.identify(savedEmail, {
          email: savedEmail,
          contact_consent: true
        });
      }
    }
    
    function disableTracking() {
      localStorage.setItem('cookie-consent', 'rejected');
      trackingDisabled = true;
      showModal = true;
    }

</script>

<NavigationBar />


<div class="about-page">
    <section class="about-header">
      <h1 class="title-about">About the UK Co-Benefit Atlas</h1>
      <h3> Read the short paper: <a href="/src/routes/about/The_UK_Co_Benefits_Atlas___Poster_Summary.pdf" target="_blank">here</a> </h3>
    </section>
  <hr/>
    <section class="about-intro">
      <!-- <p class="intro-paragraph">
        Climate actions are designed to lower greenhouse gas (GHG) emissions but the gains for society reach further. For example, electric cars reduce air pollution, retrofitting homes minimises cold, damp and mould growth, and our health outcomes in turn improve.
        </p>
      
      <p class="intro-paragraph"> 
        The CO-BENS project models 11 additional benefits for the climate actions recommended by the Climate Change Committee (CCC) in its <a href="https://www.theccc.org.uk/publication/the-seventh-carbon-budget/" target="_blank" rel="noopener noreferrer">Seventh Carbon Budget (2025)</a> to assist the United Kingdom with meeting its net zero target.
        </p>

      <p class="intro-paragraph">
        For 45,000 communities and regions, calculations consider localised context to determine actions that can be implemented in addition to how, when and for whom benefits will emerge (or in some cases costs).
        </p>

      <p class="intro-paragraph">
        Explore this data atlas to further understand connections between a wide range of social, economic and environmental priorities and drive more effective decision-making. 
      </p> -->

      <h2>
        In a nutshell
      </h2>

<p class="intro-paragraph">
The UK Co-Benefits Atlas is an interactive visual interface for communicating the co-benefits of reaching net zero across the UK. The overarching aim of this project is to support stakeholders in the making of a just and sustainable net zero United Kingdom. 
</p>
<p class="intro-paragraph">
  Climate actions are designed to lower greenhouse gas (GHG) emissions but the gains for society reach further. For example, electric cars reduce air pollution, retrofitting homes minimises cold, damp and mould growth, and our health outcomes in turn improve.
</p>
<p class="intro-paragraph">
    The CO-BENS project models 11 additional benefits for the climate actions recommended by the Climate Change Committee (CCC) in its Seventh Carbon Budget (2025) to assist the United Kingdom with meeting its net zero target.
  </p>
    <p class="intro-paragraph">
      For 46,000 communities and regions across the UK, calculations consider localised context to 
determine actions that can be implemented in addition to how, when and for whom benefits will emerge (or in some cases costs).
</p>

<p class="intro-paragraph">
Explore this data atlas to further understand connections between a wide range of social, economic and environmental priorities and drive more effective decision-making.
</p>

<p class="intro-paragraph">
  Join our mailing list to receive updates on future features and events about the atlas: https://groups.google.com/g/ukcobenefitsatlas
</p>

<h3>Atlas citation</h3>  
<p class="intro-paragraph">
    <i><a href="/src/routes/about/The_UK_Co_Benefits_Atlas___Poster_Summary.pdf" target="_blank">Phillips, S; Wang, J; Pister, A; Higgins-Lavery, R; Bissett, S; Wharmby, C; Field, S; Hinrichs, U; Sudmant, A; Bach, B (2025). “The UK Co-Benefits Atlas: An Interactive Visualisation Atlas to
      Understand the Impacts of Achieving Climate Action Targets”. Published June 25, 2025.</a></i>
</p>


<p class="intro-paragraph">
  The atlas received funding from Scotland Beyond Net Zero (https://scotland-beyond-net-zero.ac.uk). 
</p>

<h2>What are Co-Benefits?</h2>

<p class="intro-paragraph">
Current research from the Edinburgh Climate Change Institute (ECCI), using a model developed for the UK Climate Change Committee (CCC), finds that for every 1£ spent on climate change mitigation in the UK there are as much as 14£ of social benefits in the form of improved public health, better urban connectivity, and increased productivity.
</p>
<p class="intro-paragraph">
The ECCI modelling team provides 11 co-benefits for >1000 possible climate interventions in ~46,000 UK 'datazones' (lower-layer super output areas,  LSOAs) across the UK. The UKCBA continues  to co-create  this interactive and increasingly data-rich and engaging visualization atlas with its stakeholders; for this project we already have strong commitment from Scottish partners across academia, business, and the public sector (see below), stating the need of such an atlas and which are highly invested in supporting the project through attending workshops and helping with its co-design. The end result will be a collaboratively created, cutting-edge, and first-of-its-kind platform capable of facilitating interdisciplinary and cross-sectoral collaborations and decision making between diverse stakeholders around the complex socio-economic benefits of climate interventions.
</p>

<h3>Co-benefits citation</h3> 
<p class="intro-paragraph">
<i>[1] Sudmant, A., Boyle, D., Higgins‐Lavery, R., Gouldson, A., Boyle, A., Fulker, J., & Brogan, J. (2024). Climate policy as social policy? A comprehensive assessment of the economic impact of climate action in the UK. Journal of Environmental Studies and Sciences, 1-15.</i>
</p>

<h2>Who are the target audiences?</h2>


<p class="intro-paragraph">
  Accurately capturing and communicating the benefits of place-based interventions is a key stumbling block of climate change policies in Scotland. Common framings around "fiscal spend" and limited pathways for economic returns, miss the broader economic value that net zero interventions can generate. With the open data and analyses published through our atlas, we aim to inform decision making  made by:
</p>
  <ul>
    <li>Businesses seeking commercial net zero opportunities.</li> 
    <li>Communities and policy makers with net zero mandates.</li> 
    <li>Researchers and analysts examining the socio-economic co-benefits of net zero interventions.</li> 
  </ul>

<h2>What's a Visualization Atlas?</h2>

<p class="intro-paragraph">
Visualization atlases are online platforms making large and complex data sets accessible and understandable to wide audiences. To that end, they employ interactive visualizations and explanations. This project has been inspired by existing visualization atlases on, e.g., Sustainable Development Goals, the economic complexity of Our World in Data. Read more about the concept of visualization atlases and their key characteristics: 
</p>
  <ul>
  <li>TOPICS: Visualization atlases present complex topics, targeting a wide range of audiences. Topics are complex, data-driven and comprehensive.</li>
  <li>CURATION—Visualization atlases are highly curated in terms of content, data and presentation; they are scoped, structured, and visually curated.</li>
  <li>VISUALIZATION: Visualization atlases heavily rely on data visualization; they are visualization-driven, explanatory and exploratory.</li>
</ul>

<h3>Visualization Atlases citation</h3>  
<p class="intro-paragraph">
  <i>[2] <a href="https://arxiv.org/pdf/2408.07483">Wang, J., Shu X., Bach B., Hinrichs U., (2024). Visualization Atlases: Explaining and Exploring Complex Topics through Data, Visualization, and Narration. Transactions on Visualization and Computer Graphics.</a></i>
</p>

<h2>Interaction Logging</h2>
    <p class="intro-paragraph">
      This atlas anonymously logs your interactive activity (e.g., session duration, page navigation, and interaction with visualizations) for research purposes. Our goal is to create a better user experience, develop more useful Atlas features, and advance information visualization techniques. Participation is voluntary, fully anonymous unless you provide your email (optional), and users can opt in or out of logging at any time.
    </p>
    
    {#if !trackingDisabled}
      <!-- User has consented to tracking -->
      <p class="intro-paragraph">You can opt out of interaction logging if you have changed your mind.</p>
      <button class="privacy-button" on:click={disableTracking}>
        Disable Logging
      </button>
      
      {#if !hasContactConsent}
        <!-- Case 1: Tracking enabled + No email given -->
        <h3>Contact Permission</h3>
        <p class="intro-paragraph">
          We may also want to contact you about your usage patterns to improve our research. If you consent to this, please provide your email address:
        </p>
        <div class="contact-section">
          <input
            type="email"
            bind:value={userEmail}
            placeholder="your.email@example.com"
            class="email-input"
          />
          <button
            type="button"
            class="submit-button"
            on:click={submitContactInfo}
          >
            Submit
          </button>
        </div>
      {:else}
        <!-- Case 2: Tracking enabled + Email given -->
        <h3>Contact Permission</h3>
        <p class="intro-paragraph">
          You've provided your email: <strong>{savedEmail}</strong> <br> 
          We may contact you about your usage patterns to improve our research.
        </p>
        <button class="remove-button" on:click={removeContactConsent}>
          Remove Email & Contact Permission
        </button>
      {/if}
    {:else}
      <!-- Case 3: Tracking disabled -->
      <p class="intro-paragraph">Interaction logging is currently disabled.</p>
      <button class="privacy-button" on:click={enableTracking}>
        Enable Logging
      </button>
    {/if}
    
    <Modal bind:showModal>
      <p>Logging disabled. Your usage will no longer be logged.</p>
      <p>Do you also want to delete any data collected up to this point?</p>
      <button class="delete-data-button" on:click={() => {
        posthog.reset();
        showModal = false;
        showDeleteConfirmationModal = true;
        posthog.opt_out_capturing();
      }}>
        Delete My Data
      </button>
      <button class="keep-data-button" on:click={() => {
        showModal = false;
        posthog.opt_out_capturing()}}>
        Keep Data
      </button>
    </Modal>

    <Modal bind:showModal={showDeleteConfirmationModal}>
      <div class="confirmation-content">
        <p>Your request to delete your data has been processed successfully.</p>
        <p>All collected data has been removed from our systems.</p>
      </div>
    </Modal>

    <Modal bind:showModal={showDeleteEmailModal}>
      <div class="confirmation-content">
        <p>Your request to remove your email has been processed successfully.</p>
      </div>
    </Modal>

<h2>Who's involved in this project?</h2>

<h3>The co-benefits modeling team</h3>
<ul>
<li><a href="https://edinburghcentre.org/team/andrew-sudmant" target="_blank">Andrew Sudmant</a>, <i>University of Edinburgh</i></li>
<li><a href="https://edinburghcentre.org/team/ruaidhri-higgins-lavery" target="_blank">Ruaidhri Higgins-Lavery</a>, <i>University of Edinburgh</i></li>
<li><a href="https://www.climateintelligenceservice.scot/about-us/meet-the-team" target="_blank">Sarah Bissett</a>, <i>University of Edinburgh</i></li>
<li><a href="https://energyethics.st-andrews.ac.uk/people/sean-field/" target="_blank">Sean Field</a>, <i>University of St Andrews</i></li>
<li><a href="https://edinburghcentre.org/team/clare-wharmby" target="_blank">Clare Wharmby</a>, <i>University of Edinburgh</i></li>
</ul>
 
<h3>The visualization team</h3> 
<p class="intro-paragraph">
  The visualization team comprises researchers from the <a href="https://vishub.net">VisHub research</a> group at the School of Informatics, University of Edinburgh. 
</p>

<ul>
  <li><a href="https://benjbach.net" target="_blank">Benjamin Bach</a>, <i>Inria Bordeaux & University of Edinburgh</i></li>
    <li><a href="https://www.jinruiw.com/" target="_blank">Jinrui Wang</a>, <i>University of Edinburgh</i></li>
      <li><a href="https://alexispister.github.io/" target="_blank">Alexis Pister</a>, <i>University of Edinburgh</i></li>
        <li>Sian Phillips, <i>University of Edinburgh</i></li>
          <li><a href="http://utahinrichs.de/" target="_blank">Uta Hinrichs</a>, <i>University of Edinburgh</i></li>
</ul>


    </section>
  

  


    <section class="about-logos-wrapper">
        <div class="logos-grid">
          <img src="{base}/logos/SBNZ.png" alt="SBNZ" class="about-logo" />
          <img src="{base}/logos/ECCI.png" alt="ECCI" class="about-logo" />
          <img src="{base}/logos/vishub.svg" alt="VISHUB" class="about-logo" />
          <img src="{base}/logos/DI.png" alt="DI" class="about-logo" />
          <img src="{base}/logos/UOE.png" alt="UOE" class="about-logo" />
        </div>
      </section>

  </div>
  

<style>
.about-page {
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 4rem;
  padding: 2rem 1rem;
  font-family: 'Helvetica Neue', sans-serif;
  color: #333;
}

.title-about {
  font-size: 2rem;
  text-align: left;
  margin-bottom: 1.5rem;
  font-weight: lighter;
  color: #6C6C6C;
}

.intro-paragraph {
  font-size: 1.125rem;
  line-height: 1.5;
  text-align: left;
  max-width: 800px;
  margin: 0 0 1.5rem 0;
}

.intro-paragraph a {
  color: #333; 
  text-decoration: underline; 
  transition: text-decoration 0.2s ease;
  font-weight: normal;
}

.intro-paragraph a:hover {
  text-decoration: underline; 
  color: #0077cc;
}

.about-logos-wrapper {
  /* text-align: left; */
  margin-bottom: 3rem;
}

.logos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: flex-start;
  align-items: center;
}

.about-logo {
  max-width: 150px;
  height: auto;
  object-fit: contain;
}

.about-citation {
  margin-top: 2rem;
  text-align: left;
  font-size: 0.875rem;
  color: #6C6C6C;
  
}

.about-citation h2 {
    font-weight: lighter;
}

.citation-text {
  max-width: 800px;
  /* margin: 0 auto; */
  line-height: 1.4;
}

  </style>