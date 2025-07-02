<script>
    import '../app.css';
    import {onMount} from 'svelte';
    import {AVERAGE_COLOR} from "../globals";
    import {browser} from '$app/environment';
    import posthog from 'posthog-js';

    let showBanner = false;
    let showEmailInput = false;
    let userEmail = '';

    const CONSENT_KEY = 'cookie-consent';
    const CONTACT_CONSENT_KEY = 'contact-consent';
    const USER_EMAIL_KEY = 'user-email';

    function acceptCookies() {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      showBanner = false;
      showEmailInput = true;
      initPosthog();
      posthog.opt_in_capturing();
    }
    
    function rejectCookies() {
      localStorage.setItem(CONSENT_KEY, 'rejected');
      showBanner = false;
    }
        
    function submitContactInfo() {
      
      // Store consent and email
      localStorage.setItem(CONSENT_KEY, 'accepted');
      localStorage.setItem(CONTACT_CONSENT_KEY, 'true');
      localStorage.setItem(USER_EMAIL_KEY, userEmail);
      
      showEmailInput = false;
      initPosthog();
      
      posthog.identify(userEmail, {
        email: userEmail,
      });
    }

    function continueWithoutEmail() {
      localStorage.setItem(CONTACT_CONSENT_KEY, 'false');
      showEmailInput = false;
    }

    function initPosthog() {
      posthog.init(
        'phc_5El1OotgrsS7hUFInEEWFvaZnhoiQboqFfzBuYXCfwa',
        {
          api_host: 'https://eu.i.posthog.com',
          person_profiles: 'identified_only',
          defaults: '2025-05-24',
          autocapture: {
            capture_copied_text: true,
            element_allowlist: ['button', 'form', 'select', 'textarea', 'label', 'a']
          },
        }
      );
    }


    onMount(() => {
		document.documentElement.style.setProperty('--compareColor', AVERAGE_COLOR);
	});

    if (browser) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(){dataLayer.push(arguments);}
        window.gtag('js', new Date());
        window.gtag('config', 'G-GGZ403XD90');

        const consent = localStorage.getItem(CONSENT_KEY);

        // Only show banner if no consent choice has been made yet
        if (!consent) {
            showBanner = true;
        } else if (consent === 'accepted') {

            initPosthog();
            
            // If user previously gave contact consent, identify them
            const contactConsent = localStorage.getItem(CONTACT_CONSENT_KEY);
            const savedEmail = localStorage.getItem(USER_EMAIL_KEY);
            if (contactConsent === 'true' && savedEmail) {
                posthog.identify(savedEmail, {
                    email: savedEmail,
                });
            }
            
        } else if (consent === 'rejected') {
            initPosthog();
            posthog.opt_out_capturing();
        }
    }

    
</script>


{#if showBanner} 
    <div class="cookie-banner">
      <div class="banner-content">
        <p>This atlas would like to anonymously log your interactive activity (e.g., session duration, page navigation, and interaction with visualizations) for research purposes. Our goal is to create a better user experience, develop useful Atlas features, and advance information visualization techniques. <strong>Do you consent?</strong></p>
        <a href="/Participation_Information_Sheet.pdf" target="_blank" rel="noopener noreferrer">Learn how we use your data</a>.
        
          <div class="cookie-buttons">
            <button class="accept" on:click={acceptCookies}>Accept</button>
            <button class="reject" on:click={rejectCookies}>Reject</button>
          </div>

      </div>
    </div>
    {:else if showEmailInput} 
            <div class="email-section">
                <div class="email-content">
                    <p>We may also want to contact you about your usage patterns to improve our research. If you consent to this, please provide your email address:</p>
                    
                    <div class="email-input-container">
                        <div class="email-input-group">
                            <input 
                                type="email" 
                                bind:value={userEmail} 
                                placeholder="your.email@example.com"
                            />
                            <button class="submit" on:click={submitContactInfo}>Submit</button>
                        </div>
                        <button class="continue-without" on:click={continueWithoutEmail}>Continue without email</button>
                    </div>
                </div>
            </div>
    {/if}

    
  <slot/>
  
  <svelte:head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GGZ403XD90"></script>
    <title>UK Co-Benefits Atlas</title>
    <link rel="icon" href="/atlas-logos/logo_new_mini.png" type="image/png" />
    </svelte:head>
  
  <style>
    .cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #e5e7eb;
      color: #1a1a1a;
      padding: 1rem;
      z-index: 1000;
      font-size: 0.9rem;
    }
    
    .banner-content {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .cookie-banner p {
      margin: 0 0 0.5rem 0;
    }
    
    .cookie-banner a {
      color: #60a5fa;
      text-decoration: underline;
    }
    
    .cookie-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    
    .cookie-banner button, .submit  {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .cookie-banner .accept, .submit {
      background: #4ade80;
      color: black;
    }
    
    .cookie-banner .accept:hover, .submit:hover {
      background: #22c55e;
    }
        
    .cookie-banner .reject {
      background: #f87171;
      color: white;
    }
    
    .cookie-banner .reject:hover {
      background: #ef4444;
    }
    
    .email-section {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #e5e7eb;
    color: #1a1a1a;
    padding: 1rem;
    z-index: 1000;
    font-size: 0.9rem;
    }

    .email-content {
        max-width: 1100px;
        margin: 0 auto;
        text-align: left;
    }

    .email-section p {
        margin: 0.5rem 0;
    }

    .email-input-container {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 1rem;
        margin: 1rem 0;
    }

    .email-input-group {
        display: flex;
        border: 1px solid #ccc;
        border-radius: 6px;
        overflow: hidden;
        background-color: #fff;
        height: 30px;
    }

    .email-input-group input[type="email"] {
        flex: 1;
        padding: 0 0.75rem;
        font-size: 1rem;
        border: none;
        outline: none;
        height: 100%;
        min-width: 200px;
    }

    .continue-without {
        background: #9ca3af;
        color: white;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        height: 30px;
        white-space: nowrap;
    }

    .continue-without:hover {
        background: #6b7280;
    }

 
       
    @media (max-width: 768px) {
      .cookie-buttons{
        flex-direction: column;
      }
      
      .cookie-banner button {
        width: 100%;
      }
      
      .email-input-container {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .email-input-group {
        width: 90%;
      }
      
      .continue-without {
        width: 90%;
      }
    }

</style>