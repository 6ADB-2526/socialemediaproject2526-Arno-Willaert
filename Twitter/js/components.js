// js/components.js

const Components = {
    // De Login Pagina
    loginPage: () => `
    <div class="login-container">
        <h1>Inloggen bij Twitter</h1>
        <input type="text" id="username" placeholder="Gebruikersnaam">
        <input type="password" id="password" placeholder="Wachtwoord">
        
        <button onclick="login()">Log in</button>
    </div>
`,

    // De Home Pagina
    homePage: () => `
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
            
            <div class="tweet-box">
                <div class="tweet-box-avatar"></div>
                <div class="tweet-box-content">
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
`,

    // De Tweet Kaart
    tweetCard: (name, handle, content, time, id, image, likedByUser) => `
        <div class="tweet">
            <div class="tweet-avatar"></div>
            <div class="tweet-content">
                <div class="tweet-header">
                    <div class="tweet-user-info">${name} <span>@${handle} · ${time}</span></div>
                    <button class="delete-btn" onclick="deleteTweet(${id})">Verwijder</button>
                </div>
                <div class="tweet-text">${content}</div>
                ${image ? `<img src="${image}" class="tweet-image">` : ""}

                <div class="tweet-actions">
                    <button class="like-btn ${likedByUser ? 'liked' : ''}" onclick="this.classList.toggle('liked'); likeTweet(${id})">❤️</button>
                </div>
            </div>
        </div>
`,

    // De Profiel Pagina
    profilePage: (username) => `
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
                <div class="profile-banner"></div>
                <div class="profile-info">
                    <div class="profile-avatar-large"></div>
                    <h2>${username}</h2>
                    <span>@${username.toLowerCase().replace(/\s/g, '')}</span>
                </div>
            </div>
            <div id="profile-feed-container"></div>
        </main>

        <aside class="sidebar-right">
            <div class="trends-box"><h3>Trends</h3>...</div>
        </aside>
    </div>
`
}; 