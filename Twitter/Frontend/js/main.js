// frontend/js/main.js

/**
 * =========================================================================
 * 1. GLOBALE VARIABELEN
 * =========================================================================
 * Dit zijn geheugenplaatsen op het hoogste niveau van dit script. Elke functie 
 * in dit bestand kan deze variabelen lezen, gebruiken en aanpassen.
 */

// JS-UITLEG: Een lege lijst (array) die we vullen met de tweets die we live van de server ophalen.
let tweets = []; 

// JS-UITLEG: Hier slaan we tijdelijk de foto op die je wilt tweeten, omgezet naar Base64-tekst.
let selectedImageData = ""; 

// JS-UITLEG: Haal de actieve sessiegegevens op uit de LocalStorage van de browser.
// De '|| null' zorgt ervoor dat de variabele de waarde 'null' krijgt als er niemand is ingelogd.
let currentUser = localStorage.getItem('user') || null;
let currentHandle = localStorage.getItem('currentHandle') || null;

// JS-UITLEG: Een hardgecodeerde SVG-afbeelding in de vorm van een grijs Twitter-poppetje.
// Deze gebruiken we als 'back-up' als een gebruiker nog geen eigen profielfoto heeft gekozen.
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cfd9de'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";


/**
 * =========================================================================
 * 2. CORE FUNCTIES (API-INTERACTIE VIA FETCH)
 * =========================================================================
 * Deze functies gebruiken 'async/await' en 'fetch()' om asynchroon (op de achtergrond)
 * te communiceren met je Node.js/Express backend op poort 3000.
 */

/**
 * 1. Tweets ophalen van de server (GET)
 */
async function haalTweetsOp() {
    try {
        console.log("Nu live tweets ophalen van de server...");
        // API-UITLEG: Doe een standaard GET-verzoek naar de backend om de database (tweets.json) te lezen.
        const response = await fetch('http://localhost:3000/tweets');
        
        // Als de server statuscode 400, 404 of 500 teruggeeft, springen we direct naar het 'catch'-blok.
        if (!response.ok) {
            throw new Error(`Server fout bij ophalen: ${response.status}`);
        }

        // API-UITLEG: Vertaal de rauwe JSON-tekst van de server naar een bruikbare JavaScript-array.
        tweets = await response.json();
        console.log("Tweets succesvol in de array 'tweets' gezet. Aantal:", tweets.length, tweets);
        
        // UX-UITLEG: Nu de data in het geheugen zit, roepen we de functie aan om het op het scherm te tekenen.
        renderFeed();
    } catch (error) {
        // Voorkom dat de hele applicatie crasht bij een netwerkstoring; log de fout netjes in F12.
        console.error("Kan de tweets niet ophalen van de server:", error);
    }
}

/**
 * 2. Een nieuwe tweet plaatsen (POST)
 */
async function postTweet() {
    console.log("Post-knop ingedrukt!");
    
    // DOM-UITLEG: Zoek de textarea op waar de gebruiker zijn bericht in typt.
    const tweetInput = document.getElementById('new-tweet-text');
    if (!tweetInput) {
        console.error("Kan het tekstveld 'new-tweet-text' niet vinden in de HTML!");
        return; // Stop de functie als het element ontbreekt.
    }

    // Pak de daadwerkelijke tekstwaarde uit het invoerveld.
    const content = tweetInput.value; 

    // Haal de meest actuele inloggegevens op uit het browsergeheugen.
    const naam = localStorage.getItem('user') || "Admin Test";
    const handle = localStorage.getItem('currentHandle') || "admintest";
    
    // Controleer of de gebruiker al een profielfoto heeft, anders grijpen we naar de standaard placeholder.
    let huidigeAvatar = localStorage.getItem('userAvatar') || "";
    if (!huidigeAvatar.trim()) {
        huidigeAvatar = DEFAULT_AVATAR;
    }

    // VALIDATIE: Een gebruiker mag geen leeg bericht sturen, tenzij er wel een foto is geselecteerd.
    if (content.trim() === "" && selectedImageData === "") {
        alert("Typ eerst iets of kies een foto!");
        return; 
    }

    // DATA-STRUCTUUR: Bouw een blauwdruk van de tweet zoals de backend en de JSON-database die verwachten.
    const newTweet = {
        id: Date.now(), // Genereert een uniek identificatienummer op basis van milliseconden (timestamp).
        name: naam,
        handle: handle.toLowerCase().replace(/\s/g, ''), // Verwijdert spaties en zet om naar kleine letters.
        content: content,
        image: selectedImageData || "", // Voegt de Base64-afbeelding toe (indien aanwezig).
        timestamp: new Date().toLocaleString(), // Maakt een leesbare datum-stempel (bijv. "16-6-2026 21:00").
        likes: [], // Start altijd met 0 likes (een lege lijst van gebruikers).
        avatar: huidigeAvatar 
    };

    try {
        console.log("Data die we naar de server sturen:", newTweet);

        // API-UITLEG: Verstuur het pakketje via een POST-methode. We vertellen the server via de 
        // headers dat we JSON sturen, en zetten het JS-object om naar tekst via JSON.stringify().
        const response = await fetch('http://localhost:3000/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTweet)
        });

        const result = await response.json();
        console.log("Server resultaat:", result);
        
        // Als de backend bevestigt dat de tweet succesvol is opgeslagen:
        if (result.success) {
            // UX-RESET: Maak de invoervelden in de interface direct leeg voor de volgende tweet.
            tweetInput.value = "";
            selectedImageData = "";
            
            // Zet het label van de fotoknop terug naar de standaardtekst.
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) fileNameDisplay.innerText = "Geen bestand gekozen";

            // Reset de visuele karakterteller onder het invoerveld.
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.innerText = "0/280";
                charCount.style.color = "gray";
            }

            // REFRESH: Haal direct de geüpdatete lijst op van de server zodat je eigen tweet meteen bovenaan staat.
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
 * 3. Tweet verwijderen van de server (DELETE)
 */
async function deleteTweet(tweetId) {
    // Beveiliging: Vraag de gebruiker eerst via een browser-pop-up of hij het écht zeker weet.
    if (!confirm("Weet je zeker dat je deze tweet wilt verwijderen?")) return; 

    try {
        // API-UITLEG: We sturen het unieke ID van de tweet mee in de URL (bijv: /tweets/1718532900).
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log("Tweet succesvol verwijderd.");
            await haalTweetsOp(); // Synchroniseer de frontend weer met de database.
            showToast("Tweet verwijderd"); // Geef de gebruiker een subtiele melding onderin het scherm.
        }
    } catch (error) {
        console.error("Fout bij verwijderen:", error);
    }
}

/**
 * 4. Tweet liken of unliken (POST met unieke gebruikers-ID)
 */
async function likeTweet(tweetId) {
    if (!tweetId) {
        console.error("Kan niet liken: Geen tweetId meegegeven!");
        return;
    }

    const actieveGebruiker = localStorage.getItem('user') || "Anoniem";
    
    try {
        // API-UITLEG: We sturen een POST naar de specifieke like-route van deze tweet en geven
        // in de body mee WIE er op het hartje klikt, zodat de server deze naam kan toevoegen of schrappen.
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: actieveGebruiker })
        });

        if (!response.ok) throw new Error("Server gaf een foutmelding.");

        const result = await response.json();

        if (result.success) {
            console.log("Like succesvol verwerkt. Nieuw aantal:", result.likes);
            
            // DOM-MANIPULATIE: We zoeken de specifieke HTML-kaart van deze tweet op om 
            // de knop live van kleur te veranderen zonder de hele pagina te moeten verversen.
            const tweetCardElement = document.getElementById(`tweet-${tweetId}`);
            
            if (tweetCardElement) {
                const likeBtn = tweetCardElement.querySelector('.like-btn');
                const heartIcon = tweetCardElement.querySelector('.like-btn i');
                const countSpan = document.getElementById(`like-count-${tweetId}`);

                // Update de teller live met het exacte getal dat de server terugstuurde.
                if (countSpan) countSpan.innerText = result.likes; 

                // ALS de server zegt dat de gebruiker de tweet zojuist heeft GELIKED:
                if (result.likedByUser) {
                    if (likeBtn) likeBtn.classList.add('liked'); // Voeg CSS-class toe.
                    if (heartIcon) {
                        heartIcon.className = 'fas fa-heart'; // Maak het hartje 'Solid' (ingekleurd).
                        heartIcon.style.setProperty('color', '#f91880', 'important'); // Twitter-roze.
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#f91880', 'important');
                        countSpan.style.fontWeight = 'bold';
                    }
                } 
                // ALS de server zegt dat de gebruiker zijn like zojuist heeft INGETROKKEN (Unliked):
                else {
                    if (likeBtn) likeBtn.classList.remove('liked'); // Verwijder CSS-class.
                    if (heartIcon) {
                        heartIcon.className = 'far fa-heart'; // Maak het hartje weer 'Regular' (enkel randen).
                        heartIcon.style.setProperty('color', '#536471', 'important'); // Standaard grijs.
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#536471', 'important');
                        countSpan.style.fontWeight = 'normal';
                    }
                }
            }

            // ARRAY SYNCHRONISATIE: Pas ook de lokale JavaScript-array aan. Dit voorkomt dat 
            // een gezochte of gefilterde tweet ineens zijn oude like-status terugkrijgt.
            const lokaleTweet = tweets.find(t => t.id === tweetId);
            if (lokaleTweet) {
                if (Array.isArray(lokaleTweet.likes)) {
                    const idx = lokaleTweet.likes.indexOf(actieveGebruiker);
                    if (result.likedByUser && idx === -1) lokaleTweet.likes.push(actieveGebruiker);
                    if (!result.likedByUser && idx !== -1) lokaleTweet.likes.splice(idx, 1);
                } else {
                    lokaleTweet.likes = result.likes;
                }
                lokaleTweet.likedByUser = result.likedByUser;
            }
        }
    } catch (error) {
        console.error("Fout bij het liken van de tweet:", error);
    }
}


/**
 * =========================================================================
 * 3. FEED RENDERING (HTML GENEREREN EN IN DE DOM PLAKKEN)
 * =========================================================================
 */

/**
 * 5. De complete hoofdfeed op het scherm opbouwen
 */
function renderFeed() {
    console.log("renderFeed() wordt nu uitgevoerd...");

    // Zoek de container op waar de tijdlijn moet komen. We ondersteunen twee mogelijke ID's.
    const feedDiv = document.getElementById('tweet-feed');
    const targetDiv = feedDiv || document.getElementById('feed-container');

    if (!targetDiv) {
        console.error("CRITISCHE FOUT: Geen feed-container gevonden in de HTML!");
        return;
    }

    // Belangrijk: Wis eerst alle oude HTML uit de container, anders plakken we de lijst er dubbel onder.
    targetDiv.innerHTML = ""; 

    // Als de database leeg is, toon dan een vriendelijke placeholdertekst.
    if (!tweets || tweets.length === 0) {
        targetDiv.innerHTML = "<p class='no-tweets' style='padding: 20px; text-align: center; color: #536471;'>Er zijn nog geen tweets gevonden.</p>";
        return;
    }

    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    // LOOP: Ga één voor één door alle tweets uit de array heen.
    tweets.forEach((tweet) => {
        // Logica: Kijk of jouw eigen naam voorkomt in de lijst van likes voor deze tweet.
        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        // Tel hoeveel namen er in de array 'likes' staan om het totaal aantal likes te bepalen.
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);

        // Back-up check voor de profielfoto.
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        // Roep de HTML-generator aan uit js/components.js en geef alle data mee als parameters.
        const tweetHTML = Components.tweetCard(
            tweet.name,
            tweet.handle,
            tweet.content,
            tweet.timestamp || "Zojuist",
            totaalLikes,
            tweet.id,
            tweet.image,
            isGelikedDoorMij,
            avatarSrc
        );
        
        // Plak de gegenereerde HTML-kaart onderaan de container erbij (`+=`).
        targetDiv.innerHTML += tweetHTML;
    });

    console.log("renderFeed() is helemaal klaar met tekenen!");
}

/**
 * 6. Gefilterde feed tekenen voor de zoekfunctie
 */
function renderFilteredFeed(gefilterdeLijst) {
    const feedDiv = document.getElementById('tweet-feed');
    if (!feedDiv) return;
    
    feedDiv.innerHTML = ""; // Maak het scherm leeg.
    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    // Teken alleen de tweets die overblijven na de zoekfilter.
    gefilterdeLijst.forEach((tweet) => {
        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        feedDiv.innerHTML += Components.tweetCard(
            tweet.name, tweet.handle, tweet.content, tweet.timestamp || "Zojuist", 
            totaalLikes, tweet.id, tweet.image, isGelikedDoorMij, avatarSrc
        );
    });
}

/**
 * 7. Specifieke feed renderen op de profielpagina van een gebruiker
 */
function renderProfileFeed(username) {
    const container = document.getElementById('profile-feed-container');
    if (!container) return;

    // JAVASCRIPT-FILTER: Behoud alleen de tweets waarbij de auteursnaam exact gelijk is aan het profiel.
    const userTweets = tweets.filter(t => t.name === username);
    
    // Wis de container, of toon een melding als deze specifieke gebruiker nog nooit getweet heeft.
    container.innerHTML = userTweets.length === 0 ? "<p style='padding:20px; color: #536471;'>Nog geen tweets geplaatst.</p>" : "";

    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    userTweets.forEach((tweet) => {
        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

        const html = Components.tweetCard(
            tweet.name, tweet.handle, tweet.content, tweet.timestamp || "Zojuist", 
            totaalLikes, tweet.id, tweet.image, isGelikedDoorMij, avatarSrc
        );
        // 'beforeend' zorgt ervoor dat elementen netjes achter elkaar ingeladen worden in de DOM.
        container.insertAdjacentHTML('beforeend', html);
    });

    // UX-LOGICA: Nu de profielpagina staat, activeren we direct de knop waarmee je een nieuwe profielfoto kunt uploaden.
    setupAvatarUpload();
}


/**
 * =========================================================================
 * 4. GEBRUIKERSFUNCTIES (LOGIN, REGISTRATIE, LOGOUT & ZOEKEN)
 * =========================================================================
 */

/**
 * 8. Inloggen verwerken via de API
 */
async function login() {
    // Pak de getypte waarden en gebruik .trim() om per ongeluk getypte spaties voor/na de tekst te wissen.
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    if (!usernameInput || !passwordInput) {
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
        toonAlert("Vul alsjeblieft alle velden in.", "error");
        return;
    }

    try {
        console.log("Inloggegevens versturen naar server...");
        
        // Verstuur de inlogpoging via een POST-verzoek naar de backend.
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const result = await response.json();

        // Als de server controleert dat het wachtwoord klopt:
        if (result.success) {
            // Sla de persoonsgegevens op in LocalStorage zodat de browser je onthoudt.
            localStorage.setItem('user', result.name); 
            localStorage.setItem('currentHandle', result.handle);
            
            // Sla de profielfoto op in het gheugen, of gebruik de standaard placeholder.
            if (result.userAvatar && result.userAvatar.trim()) {
                localStorage.setItem('userAvatar', result.userAvatar);
            } else {
                localStorage.setItem('userAvatar', DEFAULT_AVATAR);
            }
            
            // Update de globale applicatie-variabelen.
            currentUser = result.name;
            currentHandle = result.handle;
            
            console.log("Inloggen geslaagd!");
            navigateTo('home'); // Stuur de gebruiker via de router door naar de feed!
        } else {
            // AANGEPAST: Gebruikt nu de mooie in-app custom alert
            toonAlert(result.message, "error");
        }
    } catch (error) {
        console.error("Fout tijdens inloggen:", error);
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
        toonAlert("Kan geen verbinding maken met de inlogserver.", "error");
    }
}

/**
 * 9. Registreren via de API met ingebouwde wachtwoordbeveiliging
 */
async function register() {
    const nameInput = document.getElementById('reg-name').value.trim();
    const usernameInput = document.getElementById('reg-username').value.trim();
    const passwordInput = document.getElementById('reg-password').value.trim();

    if (!nameInput || !usernameInput || !passwordInput) {
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
        toonAlert("Vul alsjeblieft alle velden in!", "error");
        return;
    }

    // SECURE VALIDATIE 1: Wachtwoord moet dwingend minimaal 12 karakters lang zijn.
    if (passwordInput.length < 12) {
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
        toonAlert("Wachtwoord moet minimaal 12 tekens zijn!", "error");
        return;
    }

    // SECURE VALIDATIE 2: Een Reguliere Expressie (Regex) controleert of er minimaal één speciaal teken aanwezig is.
    const speciaalTekenRegex = /[^a-zA-Z0-9]/;
    if (!speciaalTekenRegex.test(passwordInput)) {
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
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
            // AANGEPAST: Toont eerst de prachtige groene succes-notificatie
            toonAlert("Account succesvol aangemaakt! 🎉", "success");
            
            // Wacht 2 seconden zodat de gebruiker kan genieten van het succes, en stuur dan door
            setTimeout(() => {
                navigateTo('login');
            }, 2000);
        } else {
            // AANGEPAST: Gebruikt nu de mooie in-app custom alert
            toonAlert(result.message, "error");
        }
    } catch (error) {
        console.error("Fout tijdens registreren:", error);
        // AANGEPAST: Gebruikt nu de mooie in-app custom alert
        toonAlert("Kan geen verbinding maken met de server.", "error");
    }
}

/**
 * 10. Uitloggen en browsergeheugen leegmaken
 */
function logout() {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        // Wis alle opgeslagen sessiesleutels uit de browser zodat niemand anders op je account kan.
        localStorage.removeItem('user');
        localStorage.removeItem('currentHandle');
        localStorage.removeItem('twitter_user');
        localStorage.removeItem('userAvatar'); 
        
        // Reset de runtime variabelen naar nul.
        currentUser = null;
        currentHandle = null;
        
        console.log("Gebruiker is uitgelogd.");
        navigateTo('login'); // Smijt de gebruiker terug naar het loginscherm.
    }
}

/**
 * 11. De zoekbalk (Filtert live op tekstinhoud of naam)
 */
function handleSearch() {
    // Pak de zoekterm en zet hem om naar kleine letters zodat zoeken niet hoofdlettergevoelig is.
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // Filter de grote 'tweets' array op basis van de ingetypte letters.
    const gefilterdeTweets = tweets.filter(tweet => {
        return tweet.content.toLowerCase().includes(searchTerm) || 
               tweet.name.toLowerCase().includes(searchTerm);
    });

    // Teken alleen de resultaten die voldoen aan de filter.
    renderFilteredFeed(gefilterdeTweets);
}


/**
 * =========================================================================
 * 5. UX LOGICA EN EVENT LISTENERS CONFIGURATIE
 * =========================================================================
 */

/**
 * 12. Event listeners voor de tweetbox (Invoermonitoring en karakterteller)
 */
function setupTweetBox() {
    const textarea = document.getElementById('new-tweet-text');
    const charCount = document.getElementById('char-count');
    const btn = document.getElementById('tweet-btn');

    if (!textarea) return;

    // HOTKEY: Luister of de gebruiker de 'Ctrl + Enter' toetsencombinatie indrukt om snel te posten.
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            postTweet();
        }
    });

    // LIVE TELLER: Elke keer dat de gebruiker een letter typt of verwijdert, vuurt dit event af.
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        if (charCount) charCount.innerText = `${length}/280`;

        // SCENARIO 1: Te veel letters getypt.
        if (length > 280) {
            if (charCount) charCount.style.color = "#dc2626"; // Maak de teller rood.
            if (btn) btn.disabled = true; // Blokkeer de verzendknop.
        } 
        // SCENARIO 2: Bijna de limiet bereikt (tussen 250 en 280 tekens).
        else if (length > 250) {
            if (charCount) charCount.style.color = "#f59e0b"; // Maak de teller oranje als waarschuwing.
            if (btn) btn.disabled = false;
        } 
        // SCENARIO 3: Veilige zone.
        else {
            if (charCount) charCount.style.color = "#657786"; // Standaard Twitter-grijs.
            btn.disabled = length === 0; // De knop staat UIT als het veld helemaal leeg is.
        }
    });
}

/**
 * 13. Afbeeldingen selecteren en omzetten naar tekst (FileReader API)
 */
function setupImageUpload() {
    const fileInput = document.getElementById('new-tweet-image-file');
    const nameDisplay = document.getElementById('file-name-display');

    if (!fileInput) return;

    // Luister of er een bestand geselecteerd wordt via de bestandenkiezer.
    fileInput.addEventListener('change', function() {
        const file = this.files[0]; // Pak het eerste geselecteerde bestand.
        if (file) {
            const reader = new FileReader(); // Initialiseer de ingebouwde browser-bestandslezer.
            
            // Dit event vuurt af zodra de browser de afbeelding succesvol heeft ingelezen.
            reader.onload = function(e) {
                // Sla de gecodeerde Base64-string op in onze globale variabele.
                selectedImageData = e.target.result; 
                if (nameDisplay) {
                    nameDisplay.innerText = "Geselecteerd: " + file.name;
                    nameDisplay.style.color = "#1d9bf0"; // Geef een visuele blauwe bevestiging.
                }
            };
            // Start het daadwerkelijke inleesproces van de foto.
            reader.readAsDataURL(file);
        }
    });
}

/**
 * 14. Dark Mode Schakelaar
 */
function toggleDarkMode() {
    // .toggle voegt de class 'dark-theme' toe als deze er niet is, en verwijdert hem als hij er wel is.
    document.body.classList.toggle('dark-theme');
    
    // Controleer of de mode nu aan of uit staat en sla dit op in de LocalStorage 
    // zodat de site bij de volgende verversing direct in de juiste modus opstart.
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('dark_mode', isDark);
}

/**
 * 15. Toasts tonen (Kleine pop-up meldingen onderin het scherm)
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Maak dynamisch via JavaScript een nieuwe `<div>` aan.
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast); // Plak de melding in de container op het scherm.
    
    // UX-TIMING: Laat de melding na 3 seconden (3000ms) langzaam vervagen en wis hem daarna uit de HTML.
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500); // Wacht 500ms op de CSS-animatie en wis het element.
    }, 3000);
}

/**
 * 16. Profielfoto wijzigen via de Profielpagina
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
                    // API-UITLEG: Stuur de nieuwe Base64-fotocode via een POST naar de avatar-update-route.
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
                        // 1. Update direct de grote profielafbeelding op het scherm.
                        const profileImg = document.getElementById('profile-page-avatar');
                        if (profileImg) profileImg.src = result.avatar;

                        // Update ook de kleine avatar in de tweetbox van de homepagina.
                        const homeBoxImg = document.querySelector('.tweet-box-avatar');
                        if (homeBoxImg) homeBoxImg.src = result.avatar;

                        // 2. Sla de nieuwe foto-string op in het lokale browsergeheugen.
                        localStorage.setItem('userAvatar', result.avatar);

                        showToast("Profielfoto bijgewerkt!");
                        
                        // REFRESH: Haal alle tweets opnieuw op zodat je nieuwe foto ook direct bij je oude tweets getoond wordt!
                        await haalTweetsOp(); 
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
 * 17. Wachtwoord zichtbaar maken (Het welbekende oogje)
 */
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    
    // Als het veld nu gecodeerd is als 'password' (bolletjes):
    if (passwordInput.type === "password") {
        passwordInput.type = "text"; // Verander het type naar gewone tekst zodat je de letters ziet.
        button.textContent = "🙈"; // Verander het oog-icoon naar 'apen-gezichtje'.
    } 
    // Als het veld al leesbaar is:
    else {
        passwordInput.type = "password"; // Maak er weer onleesbare bolletjes van.
        button.textContent = "👁️"; // Zet het oogje weer open.
    }
}

/**
 * NIEUW -> 18. Custom Alert Manager
 * Regelt het tonen en automatisch wegvagen van de in-app succes/fout meldingen.
 */
function toonAlert(bericht, type) {
    const alertBox = document.getElementById('alert-message');
    if (!alertBox) return;

    // Vul de tekst en activeer de juiste CSS-classes voor styling en animatie
    alertBox.textContent = bericht;
    alertBox.className = `custom-alert ${type}`;

    // Maak een timer die na 4 seconden (4000ms) de melding weer onzichtbaar maakt
    setTimeout(() => {
        alertBox.className = "custom-alert"; // Verwijdert 'success' of 'error', waardoor display: none activeert
        alertBox.textContent = "";
    }, 4000);
}