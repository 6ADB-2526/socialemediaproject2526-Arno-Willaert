// js/components.js

/**
 * =========================================================================
 * THE COMPONENTS FACTORY
 * =========================================================================
 * Dit object bevat functies die kant-en-klare HTML-strings teruggeven.
 * Sommige functies accepteren parameters (zoals tweetCard) om dynamische data
 * live in de HTML-structuur te versmelten via `${variabele}` (template literals).
 */
const Components = {

    /**
     * 1. De Inlogpagina Template
     * Geeft de interface terug voor het inlogscherm.
     */
    loginPage: () => `
<div class="login-container">
    <h1>Inloggen bij Twitter</h1>
    <input type="text" id="username" placeholder="Gebruikersnaam">
    
    <div class="password-container">
        <input type="password" id="password" placeholder="Wachtwoord">
        <button type="button" onclick="togglePassword('password', this)">👁️</button>
    </div>
    
    <button onclick="login()">Log in</button>
    <p style="margin-top: 15px; font-size: 14px;">
        Nieuw hier? <a href="#" onclick="navigateTo('register')" style="color: #1d9bf0; text-decoration: none;">Maak een account aan</a>
    </p>

    <div id="alert-message" class="custom-alert"></div>
</div>
`,

    /**
     * 2. De Registratiepagina Template
     * Geeft de interface terug voor het aanmaken van een nieuw account.
     */
    registerPage: () => `
<div class="login-container">
    <h1>Account aanmaken</h1>
    <input type="text" id="reg-name" placeholder="Volledige naam (bijv. Arno Willaert)">
    <input type="text" id="reg-username" placeholder="Gebruikersnaam (om in te loggen)">
    
    <div class="password-container">
        <input type="password" id="reg-password" placeholder="Wachtwoord">
        <button type="button" onclick="togglePassword('reg-password', this)">👁️</button>
    </div>
    
    <button onclick="register()">Registreer</button>
    <p style="margin-top: 15px; font-size: 14px;">
        Al een account? <a href="#" onclick="navigateTo('login')" style="color: #1d9bf0; text-decoration: none;">Log hier in</a>
    </p>

    <div id="alert-message" class="custom-alert"></div>
</div>
`,

    /**
     * 3. De Homepagina (Hoofd-layout) Template
     * Bouwt de driekolomslayout op (Sidebar links, Feed midden, Trends rechts).
     */
    homePage: () => {
        // SESSIE-CHECK: Haal de live geüploade profielfoto op uit het browsergeheugen.
        // Als de gebruiker die niet heeft, valt de code terug op een inline SVG placeholder (grijs poppetje).
        const mijnAvatar = localStorage.getItem('userAvatar') || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cfd9de"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        
        return `
    <button onclick="toggleDarkMode()" class="dark-mode-btn">🌙 Dark Mode</button>
    
    <div class="layout-wrapper">
        
        <aside class="sidebar-left">
            <div class="logo">
                <img src="assets/Logo_of_Twitter.svg.png" alt="Twitter Logo" id="main-logo">
            </div>
            <nav class="menu">
                <a href="#" onclick="navigateTo('home')"><b>Home</b></a>
                <a href="#">Verkennen</a>
                <a href="#">Meldingen</a>
                <a href="#" onclick="navigateTo('profile')">Profiel</a>
                <button onclick="logout()" class="logout-btn">Uitloggen</button>
            </nav>
        </aside>

        <main class="main-feed">
            <nav class="feed-header">
                <h2>Voor jou</h2>
            </nav>
            
            <div class="tweet-box" style="display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid #eff3f4;">
                <img src="${mijnAvatar}" class="tweet-box-avatar" style="width: 40px !important; height: 40px !important; border-radius: 50% !important; object-fit: cover !important; border: 1px solid #eff3f4 !important; flex-shrink: 0 !important;" alt="Mijn Avatar">
                
                <div class="tweet-box-content" style="flex-grow: 1;">
                    <textarea id="new-tweet-text" placeholder="Wat gebeurt er?"></textarea>
                    
                    <div class="image-upload-wrapper">
                        <label for="new-tweet-image-file" class="image-upload-label">
                            📷 Voeg foto toe
                        </label>
                        <input type="file" id="new-tweet-image-file" accept="image/*" style="display:none;">
                        <span id="file-name-display">Geen bestand gekozen</span>
                    </div>
                    
                    <div class="tweet-box-actions">
                        <span id="char-count">0/280</span>
                        <button id="tweet-btn" onclick="postTweet()">Tweet</button>
                    </div>
                </div>
            </div>

            <div id="feed-container"></div>
            <div id="tweet-feed"></div>
        </main>

        <aside class="sidebar-right">
            <div class="search-box">
                <input type="text" id="search-input" placeholder="Zoek tweets..." oninput="handleSearch()">
            </div>
            <div class="trends-box">
                <h3>Wat gebeurt er?</h3>
                <div class="trend-item">
                    <p>Trending in Nederland</p>
                    <strong>#Javascript</strong>
                    <span>1.2k Tweets</span>
                </div>
                <div class="trend-item">
                    <p>Trending in België</p>
                    <strong>#Ruben van Gucht</strong>
                    <span></span>
                </div>
            </div>
        </aside>
    </div>
`;
    },

    /**
     * 4. De Dynamische Tweet Kaart Template
     * Genereert een losse tweet op basis van data die uit de database (of array) komt.
     */
    tweetCard: (name, handle, content, timestamp, likes, id, image, likedByUser, avatar) => {
        const huidigeInlogdeGebruiker = localStorage.getItem('user');

        // RECHTEN-CHECK: Bepaal of de huidige bezoeker het recht heeft om deze specifieke tweet te wissen.
        // Dit mag als jij de auteur bent óf als jouw accountnaam een van de admin-namen draagt.
        const magVerwijderen = (huidigeInlogdeGebruiker === name) || 
                               (huidigeInlogdeGebruiker === handle) || 
                               (huidigeInlogdeGebruiker === 'Administrator') ||
                               (huidigeInlogdeGebruiker === 'admin');

        // TYPE CASTING: Zorgt ervoor dat zowel een boolean 'true' als het databasegetal '1' als geliked worden gezien.
        const isGeliked = likedByUser === true || likedByUser === 1;

        // Back-up check voor de profielfoto van de auteur van deze tweet.
        const avatarSrc = avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cfd9de"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

        return `
        <div class="tweet-card" id="tweet-${id}" style="
            display: flex; 
            gap: 12px; 
            padding: 16px; 
            border-bottom: 1px solid #eff3f4; 
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        ">
            <img class="tweet-avatar" src="${avatarSrc}" style="
                width: 40px; 
                height: 40px; 
                border-radius: 50%; 
                object-fit: cover;
                flex-shrink: 0;
                border: 1px solid #eff3f4;
            ">
            
            <div class="tweet-content-wrapper" style="flex-grow: 1;">
                
                <div class="tweet-header" style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px; font-size: 15px;">
                    <span class="tweet-name" style="color: #0f1419;"><strong>${name}</strong></span>
                    <span class="tweet-handle" style="color: #536471;">@${handle}</span>
                    <span class="tweet-timestamp" style="color: #536471;">· ${timestamp}</span>
                </div>
                
                <div class="tweet-body">
                    <p class="tweet-content" style="
                        margin: 0; 
                        color: #0f1419; 
                        font-size: 15px; 
                        line-height: 20px; 
                        white-space: pre-wrap; /* Behoudt enters en spaties die de gebruiker typte */
                        word-break: break-word;
                    ">${content}</p>
                    
                    ${image ? `<img src="${image}" class="tweet-image" style="max-width: 100%; max-height: 400px; object-fit: cover; border-radius: 16px; margin-top: 12px; border: 1px solid #cfd9de;" />` : ''}
                </div>
                
                <div class="tweet-actions" style="display: flex; gap: 30px; margin-top: 12px; padding-top: 4px;">
                    <button onclick="likeTweet(${id})" class="like-btn ${isGeliked ? 'liked' : ''}" style="background: none !important; border: none !important; box-shadow: none !important; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 0; margin: 0;">
                        <i class="${isGeliked ? 'fas' : 'far'} fa-heart" style="font-size: 16px; color: ${isGeliked ? '#f91880' : '#536471'} !important; transition: color 0.2s;"></i>
                        <span id="like-count-${id}" class="like-count" style="color: ${isGeliked ? '#f91880' : '#536471'} !important; font-size: 13px; font-weight: ${isGeliked ? 'bold' : 'normal'};">${likes || 0}</span>
                    </button>
                    
                    ${magVerwijderen ? `
                    <button onclick="deleteTweet(${id})" class="delete-btn" style="background: none !important; border: none !important; box-shadow: none !important; cursor: pointer; display: flex; align-items: center; padding: 0; margin: 0;">
                        <i class="far fa-trash-alt" style="font-size: 16px; color: #536471; transition: color 0.2s;"></i>
                    </button>
                    ` : ''}
                </div>
                
            </div>
        </div>
        `;
    },

    /**
     * 5. De Profielpagina Template
     * Bouwt de profielpagina op inclusief banner, avatar-wijzigknop en een eigen feed-container.
     */
    profilePage: (username) => {
        const opgeslagenAvatar = localStorage.getItem('userAvatar') || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cfd9de"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

        return `
    <div class="layout-wrapper">
        <aside class="sidebar-left">
            <div class="logo">X</div>
            <nav class="menu">
                <a href="#" onclick="navigateTo('home')">Home</a>
                <a href="#" class="active"><b>Profiel</b></a>
                <button onclick="logout()" class="logout-btn">Log uit</button>
            </nav>
        </aside>

        <main class="main-feed">
            <div class="profile-header">
                <div class="profile-banner" style="height: 150px; background-color: #cfd9de;"></div>
                <div class="profile-info" style="padding: 14px; position: relative; margin-top: -60px;">
                    
                    <div class="profile-avatar-container" style="position: relative; display: inline-block;">
                        <img id="profile-page-avatar" src="${opgeslagenAvatar}" alt="Profielfoto" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #ffffff; background-color: #cfd9de;">
                        
                        <input type="file" id="avatar-upload-input" accept="image/*" style="display: none;">
                        
                        <button onclick="document.getElementById('avatar-upload-input').click()" class="btn-change-avatar" style="
                            position: absolute; 
                            bottom: 0; 
                            right: 0; 
                            background: #1d9bf0; 
                            color: white; 
                            border: none; 
                            border-radius: 50%; 
                            width: 32px; 
                            height: 32px; 
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        " title="Wijzig profielfoto">
                            <i class="fas fa-camera" style="font-size: 14px;"></i>
                        </button>
                    </div>

                    <h2 style="margin: 10px 0 2px 0; font-size: 20px; color: #0f1419;">${username}</h2>
                    <span style="color: #536471; font-size: 15px;">@${username.toLowerCase().replace(/\s/g, '')}</span>
                </div>
            </div>
            
            <div id="profile-feed-container"></div>
        </main>

        <aside class="sidebar-right">
            <div class="trends-box"><h3>Trends</h3>...</div>
        </aside>
    </div>
    `;
    }
};