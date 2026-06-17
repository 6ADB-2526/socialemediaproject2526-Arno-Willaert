// frontend/js/main.js

/**
 * =========================================================================
 * 1. GLOBALE VARIABELEN (HET PROGRAMMAGEHEUGEN)
 * =========================================================================
 * Deze variabelen staan buiten alle functies. Dit betekent dat ze 'globaal' 
 * beschikbaar zijn: elke functie in dit bestand kan deze waarden lezen of aanpassen.
 */

// LOKALE RUNTIME ARRAY: Dit is de levende lijst van tweets in het geheugen van de browser.
// Wanneer we data ophalen van de server via een GET-request, stoppen we die hierin zodat
// functies zoals renderFeed() de tweets op het scherm kunnen tekenen.
let tweets = []; 

// TIJDELIJKE AFBEELDINGSBUFFER: Hier slaan we de geselecteerde foto op die de gebruiker
// wil uploaden. De FileReader API zet een fysieke foto om in een lange tekststring (Base64),
// en die tekst parkeren we tijdelijk in deze variabele totdat de tweet echt gepost wordt.
let selectedImageData = ""; 

// SESSION MANAGEMENT (LOCALSTORAGE): Bij het opstarten van de pagina kijkt JavaScript meteen
// in het permanente browsergeheugen (localStorage) of er al een actieve sessie is.
// De '|| null' is een fallback: als er niemand is ingelogd, krijgt de variabele de waarde 'null'.
let currentUser = localStorage.getItem('user') || null;
let currentHandle = localStorage.getItem('currentHandle') || null;

// VISUELE FALLBACK (SVG AFBEELDING): Als een gebruiker (nog) geen profielfoto heeft geüpload,
// gebruiken we deze inline gecodeerde vectorafbeelding (een grijs Twitter-poppetje) als placeholder.
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cfd9de'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";


/**
 * =========================================================================
 * 2. CORE FUNCTIES (API-INTERACTIE VIA FETCH EN ASYNC/AWAIT)
 * =========================================================================
 * Deze functies communiceren met je Node.js backend op poort 3000. Omdat netwerkverzoeken
 * tijd kosten, gebruiken we 'async' (asynchroon) en 'await' (wacht op antwoord). Hierdoor 
 * bevriest de browser niet terwijl de server de database (tweets.json) verwerkt.
 */

/**
 * 1. Tijdlijn synchroniseren met de server (GET-request)
 * Haalt de meest up-to-date lijst met tweets op uit het JSON-bestand op de server.
 */
async function haalTweetsOp() {
    try {
        console.log("Nu live tweets ophalen van de server...");
        
        // ASYNCHROON VERZOEK: Fetch stuurt een standaard HTTP GET-verzoek naar de /tweets route.
        const response = await fetch('http://localhost:3000/tweets');
        
        // STATUS CHECK: Als de server een foutcode (zoals 404 of 500) geeft, forceren we een crash
        // naar het catch-blok zodat de foute data niet per ongeluk verwerkt wordt.
        if (!response.ok) {
            throw new Error(`Server fout bij ophalen: ${response.status}`);
        }

        // DATA PARSING: De server stuurt platte tekst (JSON). '.json()' vertaalt dit terug naar
        // een echte, bruikbare JavaScript-array met objecten.
        tweets = await response.json();
        console.log("Tweets succesvol in de array 'tweets' gezet. Aantal:", tweets.length, tweets);
        
        // INTERFACE UPDATEN: Nu de data correct in de globale array staat, instrueren we de
        // renderer om de tijdlijn opnieuw op het scherm te tekenen.
        renderFeed();
    } catch (error) {
        // FOUTAFVANG: Voorkomt dat de hele applicatie vastloopt bij een netwerkstoring.
        console.error("Kan de tweets niet ophalen van de server:", error);
    }
}

/**
 * 2. Een gloednieuwe tweet publiceren (POST-request)
 * Verzamelt de tekst en eventuele foto, bouwt een tweet-object en stuurt dit naar de backend.
 */
async function postTweet() {
    console.log("Post-knop ingedrukt!");
    
    // DOM COUPLING: We zoeken de textarea op waar de gebruiker typt.
    const tweetInput = document.getElementById('new-tweet-text');
    if (!tweetInput) {
        console.error("Kan het tekstveld 'new-tweet-text' niet vinden in de HTML!");
        return; 
    }

    // INTERFACE WAARDE: We pakken de pure tekst die momenteel in het invulveld staat.
    const content = tweetInput.value; 

    // ACCOUNT-VERIFICATIE: We halen de actuele profielgegevens uit de sessie (localStorage).
    const naam = localStorage.getItem('user') || "Admin Test";
    const handle = localStorage.getItem('currentHandle') || "admintest";
    
    // AVATAR DETERMINATIE: Controleer of de ingelogde gebruiker een profielfoto heeft,
    // zo niet, dan passen we de standaard grijze placeholder toe.
    let huidigeAvatar = localStorage.getItem('userAvatar') || "";
    if (!huidigeAvatar.trim()) {
        huidigeAvatar = DEFAULT_AVATAR;
    }

    // USER INPUT VALIDATIE: Voorkom dat er lege tweets (enkel spaties) naar de database worden gestuurd,
    // tenzij de gebruiker wel een afbeelding heeft geselecteerd om te uploaden.
    if (content.trim() === "" && selectedImageData === "") {
        alert("Typ eerst iets of kies een foto!");
        return; 
    }

    // BLUEPRINT OBJECT: We structureren de data exact zoals de backend server het verwacht.
    const newTweet = {
        // TIMESTAMP ID: Date.now() geeft de tijd in milliseconden sinds 1970. Dit genereert
        // een uniek nummer waarmee we deze tweet later kunnen terugvinden (bijv. om te liken of verbergen).
        id: Date.now(), 
        name: naam,
        handle: handle.toLowerCase().replace(/\s/g, ''), // Formatteert de handle: kleine letters en geen spaties.
        content: content,
        image: selectedImageData || "", // Voegt de Base64-fotostring toe (indien geselecteerd).
        timestamp: new Date().toLocaleString(), // Maakt een leesbare datum/tijd stempel (bijv. "17-6-2026 11:42").
        likes: [], // Een nieuwe tweet start altijd met een lege lijst van unieke likers.
        avatar: huidigeAvatar,
        hidden: false // Een nieuwe tweet is standaard voor iedereen zichtbaar.
    };

    try {
        console.log("Data die we naar de server sturen:", newTweet);

        // API COMMUNICATIE (POST): We vertellen de server via de headers dat we JSON-data sturen.
        // Via JSON.stringify() zetten we ons levende JavaScript-object om naar platte tekst.
        const response = await fetch('http://localhost:3000/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTweet)
        });

        const result = await response.json();
        console.log("Server resultaat:", result);
        
        // INTERFACE RESET: Als de server bevestigt dat de tweet succesvol is weggeschreven in de database:
        if (result.success) {
            tweetInput.value = ""; // Maak het tekstveld leeg.
            selectedImageData = ""; // Wis de fotobuffer.
            
            // Zet het tekstlabel van de fotoknop terug naar de beginstand.
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) fileNameDisplay.innerText = "Geen bestand gekozen";

            // Reset de karakterteller onder de tweetbox visueel.
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.innerText = "0/280";
                charCount.style.color = "gray";
            }

            // SYNCHRONISATIE: Haal direct de nieuwe lijst op van de server, zodat de eigen
            // tweet onmiddellijk bovenaan de tijdlijn verschijnt zonder de pagina te herladen.
            await haalTweetsOp();
            console.log("Tweet succesvol verwerkt en feed ververst!");
        } else {
            console.error("Server gaf succes: false ->", result.message);
        }
    } catch (error) {
        console.error("Crash tijdens het fetch-proces naar de server:", error);
    }
}

/**
 * 3. Tweet permanent vernietigen (DELETE-request)
 * Verwijdert een tweet volledig uit het JSON-bestand op de backend op basis van zijn ID.
 */
async function deleteTweet(tweetId) {
    // SECURITY POP-UP: Vraag via een ingebouwde browser-bevestiging of de actie gewenst is.
    if (!confirm("Weet je zeker dat je deze tweet wilt verwijderen?")) return; 

    try {
        // DYNAMISCHE URL: Het unieke ID wordt als parameter in de URL meegestuurd (bijv: /tweets/1781688240).
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log("Tweet succesvol verwijderd.");
            await haalTweetsOp(); // Haal de opgeschoonde lijst op van de server.
            showToast("Tweet verwijderd"); // Toon een subtiele notificatie onderin het scherm.
        }
    } catch (error) {
        console.error("Fout bij verwijderen:", error);
    }
}

/**
 * 4. Statuswijziging doorvoeren naar de server (PUT-request)
 * Schakelt de 'hidden' status van een specifieke tweet om tussen true en false.
 */
async function toggleVerbergTweet(tweetId) {
    if (!tweetId) return;

    try {
        // METHOD PUT: Wordt in REST API's gebruikt om bestaande data in de database bij te werken.
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/hide`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        // FOUTAFVANG: Als de server met status 500 of 404 reageert, springen we meteen naar 'catch'.
        if (!response.ok) throw new Error("Server kon de verberg-status niet aanpassen.");

        const result = await response.json();

        // FRONTEND SYNCHRONISATIE: Als de backend de status succesvol heeft omgezet in het JSON-bestand:
        if (result.success) {
            // Pas de status direct aan in onze lokale runtime array in het browsergeheugen.
            // We controleren zowel op type Number als String om typefouten te voorkomen (t.id == tweetId).
            const doelTweet = tweets.find(t => t.id == tweetId);
            if (doelTweet) {
                doelTweet.hidden = result.hidden; // Synchroniseer de nieuwe status (true of false).
            }

            // FEEDBACK LOGICA: Toon de juiste notificaties en pop-ups op basis van de nieuwe status.
            if (result.hidden) {
                showToast("Bericht verborgen voor anderen");
                toonAlert("Bericht is nu onzichtbaar voor anderen! 👁️‍🗨️", "success");
            } else {
                showToast("Bericht weer openbaar");
                toonAlert("Bericht is weer voor iedereen zichtbaar! 👀", "success");
            }

            // VISUELE UPDATE: Teken de feed direct opnieuw op het scherm. Hierdoor verandert
            // het oog-icoontje of het blauwe randje onmiddellijk voor de eigenaar van de tweet.
            renderFeed();
        }
    } catch (error) {
        console.error("Fout bij het wijzigen van de verberg-status:", error);
        toonAlert("Kon de status niet aanpassen.", "error");
    }
}

/**
 * 5. Tweet liken of unliken (POST-request met gebruikersnaam)
 * Registreert wie er op het hartje klikt en past de interface direct visueel aan.
 */
async function likeTweet(tweetId) {
    if (!tweetId) {
        console.error("Kan niet liken: Geen tweetId meegegeven!");
        return;
    }

    const actieveGebruiker = localStorage.getItem('user') || "Anoniem";

    // HOOGTEPUNT BUSINESS LOGICA: Zoek de tweet op in het lokale geheugen.
    const doelTweet = tweets.find(t => t.id === tweetId);
    
    // ANTI-FRAUDE CHECK: Een gebruiker mag nooit zijn eigen tweets liken.
    if (doelTweet && doelTweet.name === actieveGebruiker) {
        toonAlert("Je kunt je eigen tweets niet liken! 😉", "error");
        return; // Stop de functie direct, er wordt GEEN verzoek naar de server gestuurd.
    }
    
    try {
        // API INTERACTIE: Verstuur de naam van de actieve gebruiker in de body naar de specifieke like-route.
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: actieveGebruiker })
        });

        if (!response.ok) throw new Error("Server gaf een foutmelding.");

        const result = await response.json();

        if (result.success) {
            console.log("Like succesvol verwerkt. Nieuw aantal:", result.likes);
            
            // INTERACTIVE DOM-MANIPULATIE: We pakken de specifieke HTML-kaart van deze tweet vast.
            const tweetCardElement = document.getElementById(`tweet-${tweetId}`);
            
            if (tweetCardElement) {
                const likeBtn = tweetCardElement.querySelector('.like-btn');
                const heartIcon = tweetCardElement.querySelector('.like-btn i');
                const countSpan = document.getElementById(`like-count-${tweetId}`);

                // Update direct het getal naast het hartje in de HTML.
                if (countSpan) countSpan.innerText = result.likes; 

                // VISUELE SWAP (GELIKED): Als de server meldt dat we de tweet zojuist succesvol hebben geliked.
                if (result.likedByUser) {
                    if (likeBtn) likeBtn.classList.add('liked'); // Voeg een CSS-klasse toe voor styling.
                    if (heartIcon) {
                        heartIcon.className = 'fas fa-heart'; // Verander het icoon naar een gevuld hartje.
                        heartIcon.style.setProperty('color', '#f91880', 'important'); // Kleur het Twitter-rood.
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#f91880', 'important');
                        countSpan.style.fontWeight = 'bold';
                    }
                } 
                // VISUELE SWAP (UNLIKED): Als we de like zojuist hebben ingetrokken.
                else {
                    if (likeBtn) likeBtn.classList.remove('liked'); // Verwijder de CSS-stijl klasse.
                    if (heartIcon) {
                        heartIcon.className = 'far fa-heart'; // Verander terug naar een leeg hartje.
                        heartIcon.style.setProperty('color', '#536471', 'important'); // Maak het weer grijs.
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#536471', 'important');
                        countSpan.style.fontWeight = 'normal';
                    }
                }
            }

            // ARRAY SYNCHRONISATIE: We werken ook de lokale runtime array bij zodat de data
            // synchroon blijft als de feed later om een andere reden opnieuw rendert.
            if (doelTweet) {
                if (Array.isArray(doelTweet.likes)) {
                    const idx = doelTweet.likes.indexOf(actieveGebruiker);
                    if (result.likedByUser && idx === -1) doelTweet.likes.push(actieveGebruiker);
                    if (!result.likedByUser && idx !== -1) doelTweet.likes.splice(idx, 1);
                } else {
                    doelTweet.likes = result.likes;
                }
                doelTweet.likedByUser = result.likedByUser;
            }
        }
    } catch (error) {
        console.error("Fout bij het liken van de tweet:", error);
    }
}


/**
 * =========================================================================
 * 3. FEED RENDERING (DYNAMISCHE HTML GENEREREN EN IN DE DOM PLAKKEN)
 * =========================================================================
 * Deze sectie leest de JavaScript-arrays en vertaalt de rauwe data naar visuele 
 * HTML-elementen die in de browser getoond worden.
 */

/**
 * 6. De complete hoofdfeed opbouwen en uittekenen
 */
function renderFeed() {
    console.log("renderFeed() wordt nu uitgevoerd...");

    // DOM INJECTIEPUNT: Zoek de container in de HTML waar de tijdlijn moet komen.
    const feedDiv = document.getElementById('tweet-feed');
    const targetDiv = feedDiv || document.getElementById('feed-container');

    if (!targetDiv) {
        console.error("CRITISCHE FOUT: Geen feed-container gevonden in de HTML!");
        return;
    }

    // CLEAN SLATE: We maken de container eerst HELEMAAL leeg. Als we dit vergeten, 
    // zouden we bij elke nieuwe tweet de oude tweets er dubbel onder blijven herhalen.
    targetDiv.innerHTML = ""; 

    // FALLBACK SCHERM: Als er geen tweets in de database staan, tonen we een vriendelijke melding.
    if (!tweets || tweets.length === 0) {
        targetDiv.innerHTML = "<p class='no-tweets' style='padding: 20px; text-align: center; color: #536471;'>Er zijn nog geen tweets gevonden.</p>";
        return;
    }

    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    // LOOP LOGICA: We wandelen door de array met tweets heen en verwerken ze één voor één.
    tweets.forEach((tweet) => {
        
        // VISIBILITY GATEKEEPER (HET VERBERG-FILTER): 
        // Als een tweet gemarkeerd staat als hidden én jij bent NIET degene die de tweet heeft geplaatst,
        // dan stopt de loop hier onmiddellijk via 'return'. De HTML wordt voor deze tweet niet gebouwd.
        // Hierdoor is de tweet écht onzichtbaar voor anderen, maar zie je hem zelf nog wel staan!
        if (tweet.hidden === true && tweet.name !== huidigeInlogdeGebruiker) {
            return;
        }

        // CONDITIONAL STATES: Bepaal of jij deze specifieke tweet in het verleden hebt geliked.
        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        // COMPONENT TEMPLATE: We roepen een externe blauwdruk aan (Components.tweetCard) 
        // en voeden deze met alle specifieke variabelen van deze tweet.
        const tweetHTML = Components.tweetCard(
            tweet.name,
            tweet.handle,
            tweet.content,
            tweet.timestamp || "Zojuist",
            totaalLikes,
            tweet.id,
            tweet.image,
            isGelikedDoorMij,
            avatarSrc,
            tweet.hidden 
        );
        
        // PLAKKEN IN DE DOM: Voeg de gegenereerde HTML-kaart toe aan de feed-container.
        targetDiv.innerHTML += tweetHTML;
    });

    console.log("renderFeed() is helemaal klaar met tekenen!");
}

/**
 * 7. Gefilterde feed uittekenen voor de zoekfunctie
 * Werkt exact hetzelfde als renderFeed(), maar gebruikt een vooraf gefilterde sub-lijst.
 */
function renderFilteredFeed(gefilterdeLijst) {
    const feedDiv = document.getElementById('tweet-feed');
    if (!feedDiv) return;
    
    feedDiv.innerHTML = ""; 
    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    gefilterdeLijst.forEach((tweet) => {
        if (tweet.hidden === true && tweet.name !== huidigeInlogdeGebruiker) {
            return;
        }

        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        feedDiv.innerHTML += Components.tweetCard(
            tweet.name, tweet.handle, tweet.content, tweet.timestamp || "Zojuist", 
            totaalLikes, tweet.id, tweet.image, isGelikedDoorMij, avatarSrc, tweet.hidden
        );
    });
}

/**
 * 8. Specifieke feed renderen op de profielpagina van één specifieke gebruiker
 */
function renderProfileFeed(username) {
    const container = document.getElementById('profile-feed-container');
    if (!container) return;

    // ARRAY FILTER: Maak een tijdelijke lijst waar enkel tweets in staan die matchen met de profielnaam.
    const userTweets = tweets.filter(t => t.name === username);
    container.innerHTML = userTweets.length === 0 ? "<p style='padding:20px; color: #536471;'>Nog geen tweets geplaatst.</p>" : "";

    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    userTweets.forEach((tweet) => {
        if (tweet.hidden === true && tweet.name !== huidigeInlogdeGebruiker) {
            return;
        }

        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        const html = Components.tweetCard(
            tweet.name, tweet.handle, tweet.content, tweet.timestamp || "Zojuist", 
            totaalLikes, tweet.id, tweet.image, isGelikedDoorMij, avatarSrc, tweet.hidden
        );
        
        // ADJACENT INSERTION: Alternatieve, snellere manier om HTML aan het einde van een container toe te voegen.
        container.insertAdjacentHTML('beforeend', html);
    });

    // UX BINDING: Activeer de mogelijkheid om op de profielpagina een nieuwe foto te uploaden.
    setupAvatarUpload();
}


/**
 * =========================================================================
 * 4. GEBRUIKERSFUNCTIES (LOGIN, REGISTRATIE, LOGOUT & EXTRA SEARCH LOGICA)
 * =========================================================================
 */

/**
 * 9. Inlogprocedure afhandelen via de API
 */
async function login() {
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    if (!usernameInput || !passwordInput) {
        toonAlert("Vul alsjeblieft alle velden in.", "error");
        return;
    }

    try {
        console.log("Inloggegevens versturen naar server...");
        
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const result = await response.json();

        // PERSISTENTIE (INLOGGEN): Als de backend bevestigt dat het wachtwoord klopt:
        if (result.success) {
            // We slaan de vitale gegevens op in het permanente browsergeheugen (localStorage).
            localStorage.setItem('user', result.name); 
            localStorage.setItem('currentHandle', result.handle);
            
            if (result.userAvatar && result.userAvatar.trim()) {
                localStorage.setItem('userAvatar', result.userAvatar);
            } else {
                localStorage.setItem('userAvatar', DEFAULT_AVATAR);
            }
            
            // We updaten ook direct de actieve runtime variabelen bovenin ons script.
            currentUser = result.name;
            currentHandle = result.handle;
            
            console.log("Inloggen geslaagd!");
            navigateTo('home'); // Stuur de gebruiker door naar de startpagina (Single Page Router).
        } else {
            toonAlert(result.message, "error");
        }
    } catch (error) {
        console.error("Fout tijdens inloggen:", error);
        toonAlert("Kan geen verbinding maken met de inlogserver.", "error");
    }
}

/**
 * 10. Accountregistratie met strenge frontend veiligheidscontroles
 */
async function register() {
    const nameInput = document.getElementById('reg-name').value.trim();
    const usernameInput = document.getElementById('reg-username').value.trim();
    const passwordInput = document.getElementById('reg-password').value.trim();

    if (!nameInput || !usernameInput || !passwordInput) {
        toonAlert("Vul alsjeblieft alle velden in!", "error");
        return;
    }

    // SECURITY CHECK 1: Minimale lengte controleren.
    if (passwordInput.length < 12) {
        toonAlert("Wachtwoord moet minimaal 12 tekens zijn!", "error");
        return;
    }

    // SECURITY CHECK 2 (REGEX): Controleren of er minimaal één speciaal teken aanwezig is.
    // '/[^a-zA-Z0-9]/' betekent: zoek naar alles wat GEEN normale letter of cijfer is.
    const speciaalTekenRegex = /[^a-zA-Z0-9]/;
    if (!speciaalTekenRegex.test(passwordInput)) {
        toonAlert("Wachtwoord vereist een speciaal teken.", "error");
        return;
    }

    try {
        console.log("Registratiegegevens versturen naar server...");
        
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: nameInput, 
                username: usernameInput, 
                password: passwordInput
            }) 
        });

        const result = await response.json();

        if (result.success) {
            toonAlert("Account succesvol aangemaakt! 🎉", "success");
            
            // DELAY: Wacht 2 seconden (2000 ms) zodat de gebruiker de succesmelding kan lezen,
            // en stuur hem dan automatisch door naar het inlogscherm.
            setTimeout(() => {
                navigateTo('login');
            }, 2000);
        } else {
            toonAlert(result.message, "error");
        }
    } catch (error) {
        console.error("Fout tijdens registreren:", error);
        toonAlert("Kan geen verbinding maken met de server.", "error");
    }
}

/**
 * 11. Uitlogprocedure (Sessie vernietigen)
 */
function logout() {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        // Wis alle sporen uit de localStorage van de browser.
        localStorage.removeItem('user');
        localStorage.removeItem('currentHandle');
        localStorage.removeItem('twitter_user');
        localStorage.removeItem('userAvatar'); 
        
        // Reset de globale runtime variabelen naar nul.
        currentUser = null;
        currentHandle = null;
        
        console.log("Gebruiker is uitgelogd.");
        navigateTo('login'); 
    }
}

/**
 * 12. De live zoekbalk filterfunctie
 * Snijdt de tijdlijn real-time bij op basis van wat de gebruiker typt.
 */
function handleSearch() {
    // Haal de ingetypte zoekterm op en zet deze direct om naar kleine letters (case-insensitive).
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // FILTER LOGICA: We doorzoeken de hoofdarray. Als de zoekterm voorkomt in de tekst 
    // van de tweet óf in de naam van de auteur, bewaren we deze tweet in de gefilterde lijst.
    const gefilterdeTweets = tweets.filter(tweet => {
        return tweet.content.toLowerCase().includes(searchTerm) || 
               tweet.name.toLowerCase().includes(searchTerm);
    });

    // Teken de tijdlijn opnieuw, maar gebruik nu alléén de gefilterde subset!
    renderFilteredFeed(gefilterdeTweets);
}


/**
 * =========================================================================
 * 5. UX LOGICA EN EVENT LISTENERS CONFIGURATIE (GEBRUIKERSINTERACTIE)
 * =========================================================================
 */

/**
 * 13. Event listeners voor de tweetbox (Karakterteller & Sneltoetsen)
 */
function setupTweetBox() {
    const textarea = document.getElementById('new-tweet-text');
    const charCount = document.getElementById('char-count');
    const btn = document.getElementById('tweet-btn');

    if (!textarea) return;

    // SNELTOETS: Als de gebruiker Ctrl + Enter indrukt, posten we de tweet direct!
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            postTweet();
        }
    });

    // DYNAMISCHE KARAKTERTELLER MONITORING:
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        if (charCount) charCount.innerText = `${length}/280`;

        // SCENARIO 1: Te veel tekens getypt -> Teller wordt rood, verzendknop wordt geblokkeerd (.disabled = true).
        if (length > 280) {
            if (charCount) charCount.style.color = "#dc2626"; 
            if (btn) btn.disabled = true; 
        } 
        // SCENARIO 2: Bijna limiet bereikt (meer dan 250 tekens) -> Teller wordt oranje.
        else if (length > 250) {
            if (charCount) charCount.style.color = "#f59e0b"; 
            if (btn) btn.disabled = false;
        } 
        // SCENARIO 3: Veilige marge -> Teller is normaal grijs. Knop is enkel uitgeschakeld als het veld leeg is.
        else {
            if (charCount) charCount.style.color = "#657786"; 
            btn.disabled = length === 0; 
        }
    });
}

/**
 * 14. Geavanceerde Bestandsverwerking (FileReader API)
 * Leest een fysieke foto van de computer en converteert deze naar een verstuurbare Base64-tekststring.
 */
function setupImageUpload() {
    const fileInput = document.getElementById('new-tweet-image-file');
    const nameDisplay = document.getElementById('file-name-display');

    if (!fileInput) return;

    fileInput.addEventListener('change', function() {
        const file = this.files[0]; // Pak het eerste geselecteerde bestand uit de verkenner.
        if (file) {
            // BROWSER API: De FileReader kan bestanden asynchroon lezen in het geheugen.
            const reader = new FileReader(); 
            
            // EVENT HANDLER: Dit vuurt zodra de computer klaar is met het inlezen van de foto.
            reader.onload = function(e) {
                // Sla de gegenereerde Base64-tekststring (data:image/png;base64,...) op in de globale buffer.
                selectedImageData = e.target.result; 
                if (nameDisplay) {
                    nameDisplay.innerText = "Geselecteerd: " + file.name;
                    nameDisplay.style.color = "#1d9bf0"; // Geef het label een blauwe kleur ter bevestiging.
                }
            };
            
            // START OPDRACHT: Converteer het bestand naar een gecodeerde data-URL string.
            reader.readAsDataURL(file);
        }
    });
}

/**
 * 15. Dark Mode Schakelaar (CSS Klasse triggeren)
 */
function toggleDarkMode() {
    // '.toggle' voegt de klasse toe als hij er niet is, en verwijdert hem als hij er wel is.
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('dark_mode', isDark); // Sla de voorkeur op voor een volgend bezoek!
}

/**
 * 16. Toasts genereren (Kleine notificatieblokjes onderin het scherm)
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // DYNAMISCH ELEMENT: We maken on-the-fly een nieuwe div aan via puur JavaScript.
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast); // Plak de div fysiek in de HTML-structuur.
    
    // TIMEOUT ANIMATIE: Laat het notificatieblokje na 3 seconden langzaam vervagen en ruim het daarna op.
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500); // Verwijder het element volledig uit de HTML boom (DOM-cleanup).
    }, 3000);
}

/**
 * 17. Profielfoto live bijwerken via de profielpagina (FileReader & API POST)
 */
function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatar-upload-input');
    if (!avatarInput) return;

    avatarInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                const base64Image = e.target.result;
                const actieveGebruiker = localStorage.getItem('user');

                try {
                    // Stuur de gecodeerde foto naar de avatar-update endpoint van de server.
                    const response = await fetch('http://localhost:3000/update-avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: actieveGebruiker,
                            avatarData: base64Image
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // DOM MANIPULATIE: Zoek alle profielfoto's op het scherm en vervang ze direct door de nieuwe afbeelding.
                        const profileImg = document.getElementById('profile-page-avatar');
                        if (profileImg) profileImg.src = result.avatar;

                        const homeBoxImg = document.querySelector('.tweet-box-avatar');
                        if (homeBoxImg) homeBoxImg.src = result.avatar;

                        localStorage.setItem('userAvatar', result.avatar); // Sla op in sessie.
                        showToast("Profielfoto bijgewerkt!");
                        
                        await haalTweetsOp(); // Ververs de tijdlijn zodat ook daar je nieuwe foto overal staat.
                    } else {
                        alert("Fout bij updaten: " + result.message);
                    }
                } catch (error) {
                    console.error("Fout tijdens uploaden avatar:", error);
                }
            };
            
            reader.readAsDataURL(file);
        }
    });
}

/**
 * 18. Wachtwoord-visibiliteit schakelen (Het oogje/aapje effect)
 */
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    
    // ATTRIBUUT MANIPULATIE: Door het 'type' attribuut van de HTML-input te veranderen,
    // bepalen we of de browser er bolletjes (password) of klare tekst (text) van maakt.
    if (passwordInput.type === "password") {
        passwordInput.type = "text"; 
        button.textContent = "🙈"; // Verander de knoptekst naar een 'aapje met oogjes dicht'.
    } 
    else {
        passwordInput.type = "password"; 
        button.textContent = "👁️"; // Verander terug naar het oog-icoontje.
    }
}

/**
 * 19. Custom Alert Manager (Grote pop-up balken bovenaan de applicatie)
 */
function toonAlert(bericht, type) {
    const alertBox = document.getElementById('alert-message');
    if (!alertBox) return;

    alertBox.textContent = bericht;
    alertBox.className = `custom-alert ${type}`; // Dynamische klasse toewijzen (bijv: custom-alert success of custom-alert error)

    // AUTOMATISCHE DOWN-TIME: Haal de pop-up na exact 4 seconden (4000 ms) weer weg.
    setTimeout(() => {
        alertBox.className = "custom-alert"; 
        alertBox.textContent = "";
    }, 4000);
}

/**
 * 20. De HTML-knop 'verbergen' verbinden met de API core-logica
 * Dit fungeert als de controller die bepaalt of een gebruiker de actie mag uitvoeren.
 */
function hideTweet(id) {
    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";
    
    // VALIDATIE CHECK IN GEHEUGEN: Zoek de tweet op via zijn unieke ID in onze lokale geheugen-array.
    // We checken met '==' (of handmatig via Number en String) om typefouten (string vs integer) te vermijden.
    const doelTweet = tweets.find(t => t.id == id);
    
    // RECHTEN-CHECK: Als de tweet bestaat, maar de naam van de auteur komt NIET overeen met
    // de momenteel ingelogde persoon, breken we de actie per direct af!
    if (doelTweet && doelTweet.name !== huidigeInlogdeGebruiker) {
        toonAlert("Je kunt alleen je eigen berichten verbergen! 😉", "error");
        return; // Blokkeer de uitvoering: er wordt geen verzoek naar de server gestuurd.
    }

    // AUTORISATIE GOEDGEKEURD: Start het asynchrone PUT-proces om de status te muteren in het JSON-bestand.
    toggleVerbergTweet(id);
}