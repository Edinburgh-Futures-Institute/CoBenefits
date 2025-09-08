<script lang="ts">
    import {base} from "$app/paths";
    import {page} from '$app/stores';
    import {goto} from '$app/navigation';
    import {get} from 'svelte/store';
    import {formatDate} from "../../globals.js";
</script>

<footer>
        <div class="logos-grid">
<!--            <a href="https://vishub.net/"><img src="{base}/logos/vishub.png" alt="VISHUB" class="logo"/></a>-->
<!--            <a href="https://edinburghcentre.org/"><img src="{base}/logos/ECCI.png" alt="ECCI" class="logo"/></a>-->
<!--            <a href="https://www.inria.fr/en"><img src="{base}/logos/inria.jpg" alt="Inria" class="logo"/></a>-->
<!--            <a href="https://efi.ed.ac.uk/"><img src="{base}/logos/EFI.png" alt="UOE" class="logo"/></a>-->
<!--            <a href="https://www.designinformatics.org/"><img src="{base}/logos/DI.png" alt="DI" class="logo"/></a>-->
<!--            <a href="https://scotland-beyond-net-zero.ac.uk"><img src="{base}/logos/SBNZ.png" alt="SBNZ" class="logo"/></a>-->
<!--            <a href="https://thedatalab.com/"><img src="{base}/logos/datalab.png" alt="DataLab" class="logo"/></a>-->
        </div>

    <div id="footer-text">



<!--        Work funded by -->
<!--    <br>-->
<!--        <a href="https://scotland-beyond-net-zero.ac.uk/">Scotland Beyond Net Zero.</a>-->


    </div>

    <div>
        <ul id="footer-list">
            Anonymized version
            <p>Last updated on
        {formatDate(BUILD_DATE)}.</p>
<!--            <li style="margin-bottom: 10px;"><a href="https://docs.google.com/forms/d/1w-8Lt9bESZ56PdklTIT38plec7dPgDbJtORkatoXFVY/edit">Feedback</a></li>-->
<!--            <li><a href="https://github.com/Edinburgh-Futures-Institute/CoBenefits">Code</a></li>-->
        </ul>
    </div>
</footer>

<style>
    footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-left: 1em;
        margin-right: 1em;

        gap: 2rem;

        font-size: 14px;
        padding-top: 1rem;
        padding-bottom: 1rem;
    }

    .logos-grid > a {
        max-width: 11%;
        /*height: auto;*/
        /*object-fit: contain;*/
    }

    .logo {
        /*max-width: 11%;*/
        width: 100%;
        /*height: auto;*/
        /*object-fit: contain;*/
    }

    #footer-text {
        /*width: 120px;*/
        min-width: 10%;
        /*max-width: 200px;*/
    }


    .logos-grid {
        display: flex;
        /*flex-wrap: wrap;*/
        gap: 2rem;
        align-items: center;
    }

    #footer-list {
        list-style-type: none; /* removes bullet points */
        padding: 0; /* removes left padding */
        margin: 0;  /* optional: removes default margin */
        /*margin-right: 0.5em;*/
    }

    #footer-list > li {
        color: #6C6C6C;
        text-decoration: underline;
    }

    /*#footer-list a:visited {*/
    a:visited {
        color: #6C6C6C;
    }

    a {
        color: #6C6C6C;
        text-decoration: underline;
    }

</style>