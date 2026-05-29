// frontend/js/main.js

let tweets = []; // Begint leeg, we vullen dit met data van de server
let selectedImageData = ""; // Voor de foto-upload

// Haal dynamisch de LIVE ingelogde gebruiker op uit de LocalStorage
// We gebruiken 'user' omdat je router en login dat nu ook doen!
let currentUser = localStorage.getItem('user') || null;
let currentHandle = localStorage.getItem('currentHandle') || null;

// 1. Tweets ophalen van de server
async function haalTweetsOp() {
    try {
        console.log("Nu live tweets ophalen van de server...");
        const response = await fetch('http://localhost:3000/tweets');
        
        if (!response.ok) {
            throw new Error(`Server fout bij ophalen: ${response.status}`);
        }

        tweets = await response.json();
        console.log("Tweets succesvol in de array 'tweets' gezet. Aantal:", tweets.length, tweets);
        
        // Direct tekenen
        renderFeed();
    } catch (error) {
        console.error("Kan de tweets niet ophalen van de server:", error);
    }
}

// 2. Een nieuwe tweet plaatsen (gekoppeld aan de actieve gebruiker)
async function postTweet() {
    console.log("Post-knop ingedrukt!");
    
    const tweetInput = document.getElementById('new-tweet-text');
    if (!tweetInput) {
        console.error("Kan het tekstveld 'new-tweet-text' niet vinden in de HTML!");
        return;
    }

    const content = tweetInput.value;

    // Haal de gegevens op, met een nood-fallback als LocalStorage leeg is
    const naam = localStorage.getItem('user') || "Admin Test";
    const handle = localStorage.getItem('currentHandle') || "admintest";

    if (content.trim() === "" && selectedImageData === "") {
        alert("Typ eerst iets of kies een foto!");
        return;
    }

    const newTweet = {
        id: Date.now(),
        name: naam,
        handle: handle.toLowerCase().replace(/\s/g, ''),
        content: content,
        image: selectedImageData || "", 
        timestamp: new Date().toLocaleString(),
        likes: 0,
        likedByUser: false
    };

    try {
        console.log("Data die we naar de server sturen:", newTweet);

        const response = await fetch('http://localhost:3000/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTweet)
        });

        console.log("Server response status:", response.status);

        const result = await response.json();
        console.log("Server resultaat:", result);
        
        if (result.success) {
            tweetInput.value = "";
            selectedImageData = "";
            
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) fileNameDisplay.innerText = "Geen bestand gekozen";

            // Haal de tweets opnieuw op
            await haalTweetsOp();
            console.log("Tweet succesvol verwerkt en feed ververst!");
        } else {
            console.error("Server gaf succes: false ->", result.message);
        }
    } catch (error) {
        console.error("Cratsh tijdens het fetch-proces naar de server:", error);
    }
}

// 3. De feed op het scherm tekenen
function renderFeed() {
    console.log("renderFeed() wordt nu uitgevoerd...");

    const feedDiv = document.getElementById('tweet-feed');
    
    // Sloop-beveiliging: als 'tweet-feed' niet bestaat, probeer dan 'feed-container'
    const targetDiv = feedDiv || document.getElementById('feed-container');

    if (!targetDiv) {
        console.error("CRITISCHE FOUT: Zowel 'tweet-feed' als 'feed-container' bestaan niet in de HTML!");
        return;
    }

    targetDiv.innerHTML = "";

    if (!tweets || tweets.length === 0) {
        targetDiv.innerHTML = "<p class='no-tweets'>Er zijn nog geen tweets gevonden.</p>";
        return;
    }

    // Teken de tweets op het scherm
    tweets.forEach((tweet) => {
        const tweetHTML = Components.tweetCard(
            tweet.name,
            tweet.handle,
            tweet.content,
            tweet.timestamp || "Zojuist",
            tweet.id,
            tweet.image,
            tweet.likedByUser
        );
        targetDiv.innerHTML += tweetHTML;
    });

    console.log("renderFeed() is helemaal klaar met tekenen op het scherm!");
}

// 4. Inloggen via de API
async function login() {
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    if (!usernameInput || !passwordInput) {
        alert("Vul alsjeblieft zowel een gebruikersnaam als een wachtwoord in.");
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
            // Sla op onder exact dezelfde keys als de router verwacht
            localStorage.setItem('user', result.name); 
            localStorage.setItem('currentHandle', result.handle);
            
            console.log("Inloggen geslaagd!");
            navigateTo('home');
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error("Fout tijdens inloggen:", error);
        alert("Kan geen verbinding maken met de inlogserver.");
    }
}

// 5. Uitloggen en opschonen
function logout() {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        localStorage.removeItem('user');
        localStorage.removeItem('currentHandle');
        localStorage.removeItem('twitter_user'); // Oude key preventief opruimen
        
        console.log("Gebruiker is uitgelogd.");
        navigateTo('login');
    }
}

// 6. Tweet verwijderen via de server (op basis van uniek tweetId)
async function deleteTweet(tweetId) {
    if (!confirm("Weet je zeker dat je deze tweet wilt verwijderen?")) return; 

    try {
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log("Tweet succesvol verwijderd.");
            await haalTweetsOp(); 
            showToast("Tweet verwijderd");
        }
    } catch (error) {
        console.error("Fout bij verwijderen:", error);
    }
}

// 7. Tweet liken via de server
async function likeTweet(tweetId) {
    if (!tweetId) {
        console.error("Kan niet liken: Geen tweetId meegegeven!");
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/tweets/${tweetId}/like`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error("Server gaf een foutmelding.");
        }

        const result = await response.json();

        if (result.success) {
            console.log("Like succesvol verwerkt.");
            await haalTweetsOp(); 
        }
    } catch (error) {
        console.error("Fout bij het liken van de tweet:", error);
    }
}

// 8. Zoekfunctie
function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const gefilterdeTweets = tweets.filter(tweet => {
        return tweet.content.toLowerCase().includes(searchTerm) || 
               tweet.name.toLowerCase().includes(searchTerm);
    });

    renderFilteredFeed(gefilterdeTweets);
}

// Bonus hulp-render voor het zoeken
function renderFilteredFeed(gefilterdeLijst) {
    const feedDiv = document.getElementById('tweet-feed');
    if (!feedDiv) return;
    feedDiv.innerHTML = "";
    gefilterdeLijst.forEach((tweet) => {
        feedDiv.innerHTML += Components.tweetCard(
            tweet.name, tweet.handle, tweet.content, tweet.timestamp || "Zojuist", tweet.id, tweet.image, tweet.likedByUser
        );
    });
}

// 9. Profil Feed Renderen
function renderProfileFeed(username) {
    const container = document.getElementById('profile-feed-container');
    if (!container) return;

    const userTweets = tweets.filter(t => t.name === username);
    container.innerHTML = userTweets.length === 0 ? "<p style='padding:20px;'>Nog geen tweets geplaatst.</p>" : "";

    userTweets.forEach((tweet) => {
        const html = Components.tweetCard(tweet.name, tweet.handle, tweet.content, tweet.timestamp, tweet.id, tweet.image, tweet.likedByUser);
        container.insertAdjacentHTML('beforeend', html);
    });
}

// 10. Event listeners voor de tweetbox activeren
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
            if (charCount) charCount.style.color = "red";
            if (btn) btn.disabled = true;
        } else {
            if (charCount) charCount.style.color = "gray";
            if (btn) btn.disabled = length === 0;
        }
    });
}

// 11. Afbeeldingen upload setup
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

// 12. Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('dark_mode', isDark);
}

// 13. Toasts tonen
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