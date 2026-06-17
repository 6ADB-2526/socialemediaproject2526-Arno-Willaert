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
        avatar: huidigeAvatar,
        hidden: false // Standaard is een nieuwe tweet voor iedereen zichtbaar
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
 * 4. Tweet verbergen oder weer zichtbaar maken (PUT)
 * GECOPPELD: Deze functie handelt nu de volledige statuswijziging af met de database.
 */
async function toggleVerbergTweet(tweetId) {
    if (!tweetId) return;

    try {
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/hide`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error("Server kon de verberg-status niet aanpassen.");

        const result = await response.json();

        if (result.success) {
            // Pas de status aan in onze lokale runtime array
            const doelTweet = tweets.find(t => t.id === Number(tweetId) || t.id === tweetId);
            if (doelTweet) {
                doelTweet.hidden = result.hidden;
            }

            // Geef feedback via de custom alert manager
            if (result.hidden) {
                showToast("Bericht verborgen voor anderen");
                toonAlert("Bericht is nu onzichtbaar voor anderen! 👁️‍🗨️", "success");
            } else {
                showToast("Bericht weer openbaar");
                toonAlert("Bericht is weer voor iedereen zichtbaar! 👀", "success");
            }

            // Teken de feed opnieuw op het scherm (zodat de auteur het blauwe randje / oog-icoon direct ziet wisselen)
            renderFeed();
        }
    } catch (error) {
        console.error("Fout bij het wijzigen van de verberg-status:", error);
        toonAlert("Kon de status niet aanpassen.", "error");
    }
}

/**
 * 5. Tweet liken of unliken (POST met unieke gebruikers-ID)
 */
async function likeTweet(tweetId) {
    if (!tweetId) {
        console.error("Kan niet liken: Geen tweetId meegegeven!");
        return;
    }

    const actieveGebruiker = localStorage.getItem('user') || "Anoniem";

    // Zoek de tweet op in de lokale lijst om te kijken wie de maker is
    const doelTweet = tweets.find(t => t.id === tweetId);
    
    if (doelTweet && doelTweet.name === actieveGebruiker) {
        // Gebruik de mooie custom alert die we eerder hebben gemaakt
        toonAlert("Je kunt je eigen tweets niet liken! 😉", "error");
        return; // Stop de functie direct, zodat er geen verzoek naar de server gaat
    }
    
    try {
        // API-UITLEG: We sturen een POST naar de specifieke like-route van deze tweet
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: actieveGebruiker })
        });

        if (!response.ok) throw new Error("Server gaf een foutmelding.");

        const result = await response.json();

        if (result.success) {
            console.log("Like succesvol verwerkt. Nieuw aantal:", result.likes);
            
            // DOM-MANIPULATIE: We zoeken de specifieke HTML-kaart van deze tweet op
            const tweetCardElement = document.getElementById(`tweet-${tweetId}`);
            
            if (tweetCardElement) {
                const likeBtn = tweetCardElement.querySelector('.like-btn');
                const heartIcon = tweetCardElement.querySelector('.like-btn i');
                const countSpan = document.getElementById(`like-count-${tweetId}`);

                if (countSpan) countSpan.innerText = result.likes; 

                // ALS de server zegt dat de gebruiker de tweet zojuist heeft GELIKED:
                if (result.likedByUser) {
                    if (likeBtn) likeBtn.classList.add('liked'); 
                    if (heartIcon) {
                        heartIcon.className = 'fas fa-heart'; 
                        heartIcon.style.setProperty('color', '#f91880', 'important'); 
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#f91880', 'important');
                        countSpan.style.fontWeight = 'bold';
                    }
                } 
                // ALS de server zegt dat de gebruiker zijn like zojuist heeft INGETROKKEN (Unliked):
                else {
                    if (likeBtn) likeBtn.classList.remove('liked'); 
                    if (heartIcon) {
                        heartIcon.className = 'far fa-heart'; 
                        heartIcon.style.setProperty('color', '#536471', 'important'); 
                    }
                    if (countSpan) {
                        countSpan.style.setProperty('color', '#536471', 'important');
                        countSpan.style.fontWeight = 'normal';
                    }
                }
            }

            // ARRAY SYNCHRONISATIE: Pas ook de lokale JavaScript-array aan.
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
 * 3. FEED RENDERING (HTML GENEREREN EN IN DE DOM PLAKKEN)
 * =========================================================================
 */

/**
 * 6. De complete hoofdfeed op het scherm opbouwen
 */
function renderFeed() {
    console.log("renderFeed() wordt nu uitgevoerd...");

    const feedDiv = document.getElementById('tweet-feed');
    const targetDiv = feedDiv || document.getElementById('feed-container');

    if (!targetDiv) {
        console.error("CRITISCHE FOUT: Geen feed-container gevonden in de HTML!");
        return;
    }

    targetDiv.innerHTML = ""; 

    if (!tweets || tweets.length === 0) {
        targetDiv.innerHTML = "<p class='no-tweets' style='padding: 20px; text-align: center; color: #536471;'>Er zijn nog geen tweets gevonden.</p>";
        return;
    }

    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";

    tweets.forEach((tweet) => {
        // Filter verborgen tweets van anderen weg
        if (tweet.hidden === true && tweet.name !== huidigeInlogdeGebruiker) {
            return;
        }

        const isGelikedDoorMij = Array.isArray(tweet.likes) ? tweet.likes.includes(huidigeInlogdeGebruiker) : false;
        const totaalLikes = Array.isArray(tweet.likes) ? tweet.likes.length : (tweet.likes || 0);
        const avatarSrc = (tweet.avatar && tweet.avatar.trim()) ? tweet.avatar : DEFAULT_AVATAR;

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
        
        targetDiv.innerHTML += tweetHTML;
    });

    console.log("renderFeed() is helemaal klaar met tekenen!");
}

/**
 * 7. Gefilterde feed tekenen voor de zoekfunctie
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
 * 8. Specifieke feed renderen op de profielpagina van een gebruiker
 */
function renderProfileFeed(username) {
    const container = document.getElementById('profile-feed-container');
    if (!container) return;

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
        container.insertAdjacentHTML('beforeend', html);
    });

    setupAvatarUpload();
}


/**
 * =========================================================================
 * 4. GEBRUIKERSFUNCTIES (LOGIN, REGISTRATIE, LOGOUT & ZOEKEN)
 * =========================================================================
 */

/**
 * 9. Inloggen verwerken via de API
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

        if (result.success) {
            localStorage.setItem('user', result.name); 
            localStorage.setItem('currentHandle', result.handle);
            
            if (result.userAvatar && result.userAvatar.trim()) {
                localStorage.setItem('userAvatar', result.userAvatar);
            } else {
                localStorage.setItem('userAvatar', DEFAULT_AVATAR);
            }
            
            currentUser = result.name;
            currentHandle = result.handle;
            
            console.log("Inloggen geslaagd!");
            navigateTo('home'); 
        } else {
            toonAlert(result.message, "error");
        }
    } catch (error) {
        console.error("Fout tijdens inloggen:", error);
        toonAlert("Kan geen verbinding maken met de inlogserver.", "error");
    }
}

/**
 * 10. Registreren via de API met ingebouwde wachtwoordbeveiliging
 */
async function register() {
    const nameInput = document.getElementById('reg-name').value.trim();
    const usernameInput = document.getElementById('reg-username').value.trim();
    const passwordInput = document.getElementById('reg-password').value.trim();

    if (!nameInput || !usernameInput || !passwordInput) {
        toonAlert("Vul alsjeblieft alle velden in!", "error");
        return;
    }

    if (passwordInput.length < 12) {
        toonAlert("Wachtwoord moet minimaal 12 tekens zijn!", "error");
        return;
    }

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
 * 11. Uitloggen en browsergeheugen leegmaken
 */
function logout() {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        localStorage.removeItem('user');
        localStorage.removeItem('currentHandle');
        localStorage.removeItem('twitter_user');
        localStorage.removeItem('userAvatar'); 
        
        currentUser = null;
        currentHandle = null;
        
        console.log("Gebruiker is uitgelogd.");
        navigateTo('login'); 
    }
}

/**
 * 12. De zoekbalk (Filtert live op tekstinhoud of naam)
 */
function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const gefilterdeTweets = tweets.filter(tweet => {
        return tweet.content.toLowerCase().includes(searchTerm) || 
               tweet.name.toLowerCase().includes(searchTerm);
    });

    renderFilteredFeed(gefilterdeTweets);
}


/**
 * =========================================================================
 * 5. UX LOGICA EN EVENT LISTENERS CONFIGURATIE
 * =========================================================================
 */

/**
 * 13. Event listeners voor de tweetbox (Invoermonitoring en karakterteller)
 */
function setupTweetBox() {
    const textarea = document.getElementById('new-tweet-text');
    const charCount = document.getElementById('char-count');
    const btn = document.getElementById('tweet-btn');

    if (!textarea) return;

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            postTweet();
        }
    });

    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        if (charCount) charCount.innerText = `${length}/280`;

        if (length > 280) {
            if (charCount) charCount.style.color = "#dc2626"; 
            if (btn) btn.disabled = true; 
        } 
        else if (length > 250) {
            if (charCount) charCount.style.color = "#f59e0b"; 
            if (btn) btn.disabled = false;
        } 
        else {
            if (charCount) charCount.style.color = "#657786"; 
            btn.disabled = length === 0; 
        }
    });
}

/**
 * 14. Afbeeldingen selecteren en omzetten naar tekst (FileReader API)
 */
function setupImageUpload() {
    const fileInput = document.getElementById('new-tweet-image-file');
    const nameDisplay = document.getElementById('file-name-display');

    if (!fileInput) return;

    fileInput.addEventListener('change', function() {
        const file = this.files[0]; 
        if (file) {
            const reader = new FileReader(); 
            
            reader.onload = function(e) {
                selectedImageData = e.target.result; 
                if (nameDisplay) {
                    nameDisplay.innerText = "Geselecteerd: " + file.name;
                    nameDisplay.style.color = "#1d9bf0"; 
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

/**
 * 15. Dark Mode Schakelaar
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('dark_mode', isDark);
}

/**
 * 16. Toasts tonen (Kleine pop-up meldingen onderin het scherm)
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast); 
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
}

/**
 * 17. Profielfoto wijzigen via de Profielpagina
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
                        const profileImg = document.getElementById('profile-page-avatar');
                        if (profileImg) profileImg.src = result.avatar;

                        const homeBoxImg = document.querySelector('.tweet-box-avatar');
                        if (homeBoxImg) homeBoxImg.src = result.avatar;

                        localStorage.setItem('userAvatar', result.avatar);
                        showToast("Profielfoto bijgewerkt!");
                        
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
 * 18. Wachtwoord zichtbaar maken (Het welbekende oogje)
 */
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text"; 
        button.textContent = "🙈"; 
    } 
    else {
        passwordInput.type = "password"; 
        button.textContent = "👁️"; 
    }
}

/**
 * 19. Custom Alert Manager
 */
function toonAlert(bericht, type) {
    const alertBox = document.getElementById('alert-message');
    if (!alertBox) return;

    alertBox.textContent = bericht;
    alertBox.className = `custom-alert ${type}`;

    setTimeout(() => {
        alertBox.className = "custom-alert"; 
        alertBox.textContent = "";
    }, 4000);
}

/**
 * 20. De HTML-knop 'hideTweet' koppelen aan de API core-logica
 * GEUPDATED: Stuurt het nu netjes door naar de fetch-functie en voorkomt harde frontend 'display none'.
 */
function hideTweet(id) {
    const huidigeInlogdeGebruiker = localStorage.getItem('user') || "Anoniem";
    const doelTweet = tweets.find(t => t.id === Number(id) || t.id === id);
    
    if (doelTweet && doelTweet.name !== huidigeInlogdeGebruiker) {
        toonAlert("Je kunt alleen je eigen berichten verbergen! 😉", "error");
        return;
    }

    // Activeer de asynchrone PUT-request om het in de database op te slaan
    toggleVerbergTweet(id);
}