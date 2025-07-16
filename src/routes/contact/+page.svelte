<script lang="ts">
    import NavigationBar from "$lib/components/NavigationBar.svelte";
    import { base } from "$app/paths";
    import { onMount } from 'svelte';

  onMount(() => {
    const hash = window.location.hash?.substring(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 130;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 30); // Delay ensures DOM is ready
    }
  });

</script>

<NavigationBar />

<div class="about-page">
    <section class="about-header">
      <h1 class="title-about">Contact</h1>
    </section>

    <section class="contact" id="feedback">
      <h2>Feedback</h2>
      <p class="intro-paragraph">
      If you have any feedback or suggestions regarding the UK Co-Benefits Atlas, you can answer the <a href="https://docs.google.com/forms/d/1w-8Lt9bESZ56PdklTIT38plec7dPgDbJtORkatoXFVY">following from</a>.
      </p>
    </section>

    <section class="contact" id="email">
      <h2>Email</h2>
      <p class="intro-paragraph">
      If you have any questions regarding the UK Co-Benefits Atlas or want to get in touch, please email us via <a href="mailto:cobens@ed.ac.uk" style="color: #646cff">cobens@ed.ac.uk</a>.
      </p>
    </section>

    <section class="contact" id="newsletter">
      <h2>Newsletter</h2>
      <p class="intro-paragraph">
      <a href="https://groups.google.com/g/ukcobenefitsatlas" style="color: #646cff">Subscribe</a> to our mailing list for lastest feature updates, training sessions, and more community events!
      </p>
    </section>

    <section class="contact" id="training" style="margin-bottom: 100px;">
      <h2>Tutorial Sessions</h2>
      <p class="intro-paragraph">
      We now offer hands-on support for your use of the atlas—whether you're just getting started or already utilising it. These in-person or online, one-on-one sessions are part of our effort to disseminate and improve the atlas as well as studying how the atlas is used.
      </p>

      <p class="intro-paragraph">
        Sign-up: <a href="https://calendly.com/jwang120-ed/uk-co-benefit-atlas-tutorial" target="_blank" style="color: #646cff">Book via Calendly</a>
      </p>

      <p class="intro-paragraph">
      For you, the sessions are a chance to: <br />
      (1) get tailored help with navigating, interpreting, and applying the atlas to your tasks; <br />
      (2) share your experience so we can improve the tool for everyone; <br />
      (3) help us learn about your background and potential use cases so we can improve the atlas. <br />
      </p>

      <p class="intro-paragraph">
      The one-on-one sessions are informal and conversational. No pre-knowledge is required. Our team is here to answer your questions. Sessions can last up to 45-60 minutes, and are scheduled flexibly via Calendly. You’re welcome to sign up whether you’ve used the atlas a little or not at all.
      </p>

      <p class="intro-paragraph">
          Please feel free to forward this invitation to others who might be interested. If you have any questions, please reach out to us. 
      </p>

      <p class="intro-paragraph" style="font-style: italic; font-size: 1rem;">
          Please note: To help improve the Co-Benefits Atlas, we ask you for your consent to audio and video record the  sessions. These materials are used only within the atlas development team. If we include any observations in scientific publications (e.g., summaries or quotes), these will be fully anonymized. Our data collection process has been approved by the School of Informatics ethics board. After signing up to a session, you’ll receive a participant information sheet with more details. If at any point you’d prefer that your quotes or examples not be used, just let us know—before or shortly after your session.
      </p>
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

.contact {
  margin-bottom: 70px;;
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