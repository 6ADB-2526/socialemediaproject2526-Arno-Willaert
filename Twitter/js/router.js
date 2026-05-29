// frontend/js/router.js

function navigateTo(page) {
    const appDiv = document.getElementById('app');
    const user = localStorage.getItem('user'); 

    // Beveiliging: niet ingelogd? Dan naar login!
    if (!user && page !== 'login') {
        appDiv.innerHTML = Components.loginPage();
        return;
    }

    // Pagina-afhandeling (Elke pagina mag er maar ÉÉN keer in staan!)
    if (page === 'login') {
        appDiv.innerHTML = Components.loginPage();
    } 
    else if (page === 'home') {
        console.log("Router: Homepagina opbouwen...");
        
        // STAP 1: Bouw de basis HTML-structuur (muren van het huis)
        appDiv.innerHTML = Components.homePage();
        
        // STAP 2: Haal de tweets op van de server (die roept daarna vanzelf renderFeed aan!)
        haalTweetsOp(); 
        
        // STAP 3: Activeer de tweetbox en de foto-upload listeners
        setupTweetBox();
        setupImageUpload();
    } 
    else if (page === 'profile') {
        appDiv.innerHTML = Components.profilePage(user);
        if (typeof renderProfileFeed === "function") {
            renderProfileFeed(user);
        }
    }
}

// Bij het opstarten van de website
window.onload = () => {
    const user = localStorage.getItem('user');

    if (user) {
        console.log("Router ziet ingelogde gebruiker:", user);
        navigateTo('home'); 
    } else {
        navigateTo('login');
    }
};

// Bij het opstarten van de website: check of we al zijn ingelogd
window.onload = () => {
    const user = localStorage.getItem('user');

    if (user) {
        console.log("Router ziet ingelogde gebruiker bij opstarten:", user);
        navigateTo('home'); 
    } else {
        console.log("Router ziet geen gebruiker. Naar inlogscherm...");
        navigateTo('login');
    }
};