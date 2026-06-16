// frontend/js/router.js

/**
 * =========================================================================
 * 1. DE HOOFDFUNCTIE: NAVIGATIE (Single Page Application Router)
 * =========================================================================
 * Deze functie regelt alle pagina-wissels binnen je Single Page Application (SPA).
 * In plaats van dat de browser een compleet nieuwe pagina moet downloaden van een server,
 * wist deze functie simpelweg de inhoud van de centrale container en plaatst er de 
 * juiste nieuwe HTML-component in. Dit zorgt voor een razendsnelle gebruikerservaring.
 *
 * @param {string} page - De exacte naam van de doelpagina (bijv. 'home', 'login', 'profile', 'register').
 */
function navigateTo(page) {
    
    // JS-UITLEG: Selecteer de centrale <div> met id='app' uit je index.html. 
    // Dit is het "canvas" waarop de router telkens een andere pagina gaat tekenen.
    const appDiv = document.getElementById('app');
    
    // JS-UITLEG: Vraag aan de browser of er in de LocalStorage (het permanente lokale geheugen) 
    // een sleutel genaamd 'user' bestaat. Dit bevat de gebruikersnaam als de gebruiker is ingelogd.
    const user = localStorage.getItem('user'); 

    /**
     * STAP 1: BEVEILIGING (Authentication Guard)
     * Dit is de uitsmijter van je applicatie. We controleren of de bezoeker wel rechten 
     * heeft om de opgevraagde pagina te zien.
     */
    // ALS er GEEN 'user' is gevonden in het geheugen EN de gebruiker probeert naar iets anders 
    // te gaan dan de inlog- of registratiepagina...
    if (!user && page !== 'login' && page !== 'register') {
        // Log een waarschuwing in de developer console (F12) voor debugging doeleinden.
        console.log("Router blokkeert toegang: Je bent niet ingelogd! Direct naar loginscherm...");
        
        // Grijp dwingend in: overschrijf de HTML van de app-container met het inlogscherm.
        appDiv.innerHTML = Components.loginPage(); 
        
        // 'return' stopt de functie hier onmiddellijk. De rest van de code hieronder wordt NIET uitgevoerd.
        return; 
    }

    /**
     * STAP 2: PAGINA-AFHANDELING (De Schakelcentrale)
     * De uitsmijter heeft groen licht gegeven. Nu kijken we welke pagina specifiek is opgevraagd 
     * en laden we de bijbehorende HTML-componenten en JavaScript-functies in.
     */
    
    // SITUATIE A: De gebruiker wil (of moet) naar het inlogscherm.
    if (page === 'login') {
        console.log("Router: Inlogpagina inladen...");
        // Roep de functie 'loginPage()' aan uit js/components.js en zet die HTML op het scherm.
        appDiv.innerHTML = Components.loginPage(); 
    } 
    
    // SITUATIE B: De gebruiker wil een nieuw account aanmaken.
    else if (page === 'register') {
        console.log("Router: Registratiepagina inladen...");
        // Roep de functie 'registerPage()' aan uit js/components.js en zet die HTML op het scherm.
        appDiv.innerHTML = Components.registerPage(); 
    }
    
    // SITUATIE C: De gebruiker wil naar de hoofdfreed (Home).
    else if (page === 'home') {
        console.log("Router: Homepagina opbouwen...");
        
        // 1. Teken eerst de basis-layout (navigatiebalk, feed-container, trends-box).
        appDiv.innerHTML = Components.homePage();
        
        // 2. DATA HALEN: Start de functie (uit main.js) die alle opgeslagen tweets ophaalt 
        // van de database/backend en in de feed-container plakt.
        haalTweetsOp(); 
        
        // 3. INTERACTIE IMPLEMENTEREN: Activeer de code die luistert of de gebruiker in de 
        // textarea typt en op de "Tweet"-knop klikt.
        setupTweetBox();
        
        // 4. INTERACTIE IMPLEMENTEREN: Activeer de code die luistert of er een afbeelding 
        // wordt geselecteerd om mee te sturen met een tweet.
        setupImageUpload();
    } 
    
    // SITUATIE D: De gebruiker wil naar zijn of haar persoonlijke profielpagina.
    else if (page === 'profile') {
        // Backticks (``) worden gebruikt zodat we de variabele ${user} rechtstreeks in de tekst kunnen plakken.
        console.log(`Router: Profielpagina opbouwen voor ${user}...`);
        
        // Teken de profiellayout (banner, grote avatar, naam) en geef de ingelogde 'user' mee als parameter.
        appDiv.innerHTML = Components.profilePage(user);
        
        // Extra veiligheidscheck: we controleren of de functie 'renderProfileFeed' wel echt bestaat 
        // in je main.js-bestand, om fatale JavaScript-fouten op het scherm te voorkomen.
        if (typeof renderProfileFeed === "function") {
            // Als de functie bestaat, voer hem uit om specifiek de tweets van déze gebruiker te tonen.
            renderProfileFeed(user);
        }
    }
}


/**
 * =========================================================================
 * 2. INITIALISATIE (HET OPSTARTPROCES)
 * =========================================================================
 * De 'window.onload' is een ingebouwde JavaScript-luisteraar. Deze code start 
 * automatisch op het exacte moment dat de browser helemaal klaar is met het 
 * laden van de HTML-structuur en de scripts. Dit bepaalt de "landing" van de bezoeker.
 */
window.onload = () => {
    console.log("Website succesvol opgestart. Browsercontrole uitvoeren...");
    
    // Controleer bij het openen van de tab direct of de gebruiker nog ingelogd staat op deze computer.
    const user = localStorage.getItem('user');

    if (user) {
        // Er is een geldige naam gevonden! De gebruiker hoeft niet opnieuw in te loggen.
        console.log("Router ziet ingelogde gebruiker bij opstarten:", user);
        // Stuur de gebruiker direct door naar de home-feed.
        navigateTo('home'); 
    } else {
        // De LocalStorage is leeg, er is geen actieve sessie bekend.
        console.log("Router ziet geen gebruiker. Naar inlogscherm...");
        // Stuur de bezoeker direct naar het inlogscherm.
        navigateTo('login');
    }
};