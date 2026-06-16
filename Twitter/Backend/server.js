// backend/server.js

/**
 * =========================================================================
 * 1. IMPORTS & INITIALISATIE
 * =========================================================================
 * Hier importeren we de ingebouwde Node.js functies en de geïnstalleerde pakketten (modules).
 */

const express = require('express'); // Framework waarmee we de webserver en API-routes bouwen.
const cors = require('cors');       // CORS-middleware: staat toe dat de frontend (bijv. poort 5500) mag praten met de backend (poort 3000).
const fs = require('fs');           // File System: ingebouwde Node.js module om fysieke bestanden te lezen en schrijven.
const path = require('path');       // Path: helpt bij het bouwen van veilige en universele mappaden (werkt op Windows, Mac en Linux).

const app = express();              // Start een nieuwe Express-instantie op (onze server).


/**
 * =========================================================================
 * 2. MIDDLEWARE CONFIGURATIE
 * =========================================================================
 * Middleware onderschept elk binnenkomend verzoek (request) en bewerkt of 
 * controleert dit vóórdat het de specifieke route-logica bereikt.
 */

app.use(cors()); // Activeer CORS voor elk binnenkomend verzoek.

// Accepteer JSON-data in POST-verzoeken en zet de limiet op 10mb (nodig omdat foto's als zware base64-strings binnenkomen).
app.use(express.json({ limit: '10mb' }));

// STATIC SERVER: Zorgt dat Express direct bestanden zoals HTML, CSS en afbeeldingen uit de frontend-map naar de browser stuurt.
app.use(express.static(path.join(__dirname, '../frontend')));

// ROOT ROUTE: Als iemand puur naar http://localhost:3000/ surft, sturen we direct het startbestand index.html mee.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});


/**
 * =========================================================================
 * 3. HULPFUNCTIES VOOR DATABASE (JSON BESTANDEN)
 * =========================================================================
 * Onze 'flat-file database'. Deze functies openen en sluiten de JSON-bestanden.
 */

const USERS_FILE_PATH = './users.json'; // De locatie waar alle accounts veilig opgeslagen staan.
const FILE_PATH = './tweets.json';       // De locatie waar alle geplaatste tweets opgeslagen staan.

/**
 * Leest alle geregistreerde gebruikers uit users.json.
 * Maakt automatisch een administrator aan als het bestand nog niet bestaat.
 */
function readUsersFromFile() {
    // DATABASE INITIALISATIE: Als de 'gebruikersdatabase' nog niet bestaat, maken we hem nu aan.
    if (!fs.existsSync(USERS_FILE_PATH)) {
        const defaultUsers = [
            { username: "admin", password: "geheimAdmin!", name: "Administrator", handle: "admin", userAvatar: "" }
        ];
        // Schrijf de array om naar leesbare tekst (JSON) met een inspringing van 2 spaties voor leesbaarheid.
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), 'utf8');
        return defaultUsers; 
    }
    // Bestaat het bestand wel? Lees de rauwe tekst in.
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    // PARSING: Vertaal de platte tekst weer terug naar een echte, bruikbare JavaScript-lijst (array).
    return JSON.parse(data);
}

/**
 * Leest alle tweets veilig uit tweets.json.
 * Try-catch voorkomt dat de hele server crasht bij een corrupte database.
 */
function readTweetsFromFile() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        // FOUTAFVANG: Log de fout in de terminal, maar houd de server in de lucht en stuur een lege array terug.
        console.error("Fout bij lezen tweets.json:", error);
        return [];
    }
}

/**
 * Schrijft een array met tweets terug naar tweets.json op de harde schijf.
 */
function writeTweetsToFile(tweets) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(tweets, null, 2), 'utf8');
    } catch (error) {
        console.error("Fout bij schrijven naar tweets.json:", error);
    }
}


/**
 * =========================================================================
 * 4. API ROUTES (GET, POST, DELETE)
 * =========================================================================
 * Dit zijn de URL-eindpunten (endpoints) waar de frontend data kan ophalen of brengen.
 */

/**
 * 1. GET /tweets - Geef de complete tijdlijn vrij
 */
app.get('/tweets', (req, res) => {
    const tweets = readTweetsFromFile(); // Haal de up-to-date lijst uit het JSON-bestand.
    res.json(tweets);                    // Stuur de lijst als JSON-formaat terug naar de browser.
});

/**
 * 2. POST /tweets - Sla een nieuwe tweet op
 */
app.post('/tweets', (req, res) => {
    const newTweet = req.body;           // Vang het tweet-object op dat de frontend heeft verstuurd.
    const tweets = readTweetsFromFile(); // Open de huidige database.
    
    // UNSHIFT: Voeg de nieuwe tweet vooraan de lijst toe, zodat nieuwere tweets bovenaan de feed verschijnen.
    tweets.unshift(newTweet); 
    
    writeTweetsToFile(tweets);           // Sla de bijgewerkte lijst op.
    res.json({ success: true, message: 'Tweet opgeslagen!' }); // Geef een succes-bevestiging.
});

/**
 * 3. DELETE /tweets/:id - Verwijder een specifieke tweet
 */
app.delete('/tweets/:id', (req, res) => {
    try {
        // Haal het ID uit de URL-parameter (req.params.id) en zet het om van tekst naar een getal.
        const tweetIdToDelete = Number(req.params.id);
        const tweets = readTweetsFromFile();
        
        // FILTER: Maak een nieuwe lijst waar de tweet met het aangevraagde ID uitgesloten is.
        const opgeschoondeTweets = tweets.filter(t => t.id !== tweetIdToDelete);
        
        writeTweetsToFile(opgeschoondeTweets); 
        res.json({ success: true });           
    } catch (error) {
        // HTTP STATUS 500: Geef aan de frontend door dat er aan de serverkant iets is misgegaan.
        res.status(500).json({ success: false }); 
    }
});

/**
 * 4. POST /tweets/:id/like - Like of unlike een tweet
 */
app.post('/tweets/:id/like', (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        const { username } = req.body; // De frontend moet doorgeven *wie* er op de like-knop klikt.

        if (!username) {
            return res.status(400).json({ success: false, message: "Geen gebruikersnaam meegegeven." });
        }

        const tweets = readTweetsFromFile();
        const tweet = tweets.find(t => t.id === tweetId);

        if (!tweet) {
            return res.status(404).json({ success: false, message: "Tweet niet gevonden." });
        }

        // DATABASE MIGRATIE/CHECK: Mocht 'likes' nog een ouderwets getal zijn, zet het om naar een array (lijst van namen).
        if (!Array.isArray(tweet.likes)) {
            tweet.likes = [];
        }

        // INDEXOF: Zoek op of deze gebruikersnaam al in de array met likes voorkomt. (-1 betekent: niet gevonden).
        const userIndex = tweet.likes.indexOf(username);
        let likedByUser = false;

        if (userIndex === -1) {
            // TOGGLE LOGICA: Gebruiker heeft nog niet geliked -> Voeg de naam toe aan de lijst.
            tweet.likes.push(username);
            likedByUser = true;
            console.log(`--> ${username} heeft tweet ${tweetId} geliked`);
        } else {
            // TOGGLE LOGICA: Gebruiker had al wel geliked -> Verwijder de naam uit de lijst (unliken).
            tweet.likes.splice(userIndex, 1);
            likedByUser = false;
            console.log(`--> ${username} heeft de like van tweet ${tweetId} ingetrokken`);
        }

        writeTweetsToFile(tweets);

        // Stuur het nieuwe totale aantal likes (lengte van de array) en de status voor deze specifieke gebruiker terug.
        res.json({
            success: true,
            likes: tweet.likes.length,
            likedByUser: likedByUser
        });

    } catch (error) {
        console.error("Fout bij verwerken van like:", error);
        res.status(500).json({ success: false, message: "Serverfout bij het liken." });
    }
});

/**
 * 5. POST /login - Authenticatiecontrole
 */
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body; // Pak de ingevulde inlogdata uit het verzoek.
        const users = readUsersFromFile();

        // VALIDATIE: Zoek een gebruiker waarbij de naam matcht (hoofdletterongevoelig) én het wachtwoord exact klopt.
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (user) {
            console.log(`--> Gebruiker ${user.username} succesvol ingelogd!`);
            
            // SECURITY: Stuur de gebruikersdata terug naar de frontend, maar laat het wachtwoord bewust WEG!
            res.json({ 
                success: true, 
                username: user.username, 
                name: user.name, 
                handle: user.handle,
                userAvatar: user.userAvatar || "" 
            });
        } else {
            console.log(`--> Mislukte inlogpoging voor: ${username}`);
            // HTTP STATUS 401: Onbevoegd/foute inloggegevens.
            res.status(401).json({ success: false, message: "Onjuiste gebruikersnaam of wachtwoord!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Serverfout bij het inloggen." });
    }
});

/**
 * 6. POST /register - Accountregistratie met strenge wachtwoord-eisen
 */
app.post('/register', (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Wachtwoord is verplicht.' });
        }

        // BACKEND VEILIGHEIDSCHECK 1: Is het wachtwoord lang genoeg? (minimaal 12 tekens)
        if (password.length < 12) {
            return res.status(400).json({ success: false, message: 'Wachtwoord moet minimaal 12 tekens lang zijn.' });
        }

        // BACKEND VEILIGHEIDSCHECK 2: Bevat het wachtwoord een speciaal teken? (alles wat geen letter of cijfer is)
        const speciaalTekenRegex = /[^a-zA-Z0-9]/;
        if (!speciaalTekenRegex.test(password)) {
            return res.status(400).json({ success: false, message: 'Wachtwoord moet minimaal 1 speciaal teken bevatten.' });
        }

        const users = readUsersFromFile();

        // UNIEKHEIDSCHECK: Bestaat deze gebruikersnaam al in de database?
        const bestaatAl = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (bestaatAl) {
            return res.status(400).json({ success: false, message: 'Gebruikersnaam bestaat al' });
        }

        // CONSTRUCTIE: Bouw het nieuwe database-object. De handle wordt automatisch geformatteerd (kleine letters, zonder spaties).
        const nieuweGebruiker = {
            name: name,
            username: username,
            password: password, 
            handle: username.toLowerCase().replace(/\s/g, ''),
            userAvatar: "" // Begint leeg bij een nieuw account
        };

        users.push(nieuweGebruiker); // Voeg de nieuwe gebruiker toe aan de lijst.
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8'); // Sla op.

        res.json({ success: true, message: 'Account succesvol aangemaakt!' });
    } catch (error) {
        console.error("Fout bij registratie:", error);
        res.status(500).json({ success: false, message: "Serverfout bij registreren." });
    }
});

/**
 * 7. POST /update-avatar - Werk de profielfoto bij in de database
 */
app.post('/update-avatar', (req, res) => {
    try {
        const { username, avatarData } = req.body; // Bevat de naam en de base64-fotodata string.

        if (!username || !avatarData) {
            return res.status(400).json({ success: false, message: "Gegevens missen." });
        }

        const users = readUsersFromFile();
        // Zoek de gebruiker op (flexibele check: match op username óf de volledige naam).
        const user = users.find(u => u.username === username || u.name === username);

        if (!user) {
            return res.status(404).json({ success: false, message: "Gebruiker niet gevonden." });
        }

        // Overschrijf de avatar van de gebruiker met de nieuwe afbeelding.
        user.userAvatar = avatarData;

        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8'); // Sla de database op.

        res.json({ success: true, message: "Profielfoto succesvol bijgewerkt!", avatar: avatarData });
    } catch (error) {
        console.error("Fout bij updaten profielfoto:", error);
        res.status(500).json({ success: false, message: "Serverfout." });
    }
});


// DIAGNOSTISCHE TEST-CODE: Dit draait éénmalig op de achtergrond zodra je de server opstart.
// Het laat in de terminal direct zien of de backend je frontend-map wel écht kan vinden.
const testPad = path.join(__dirname, '../frontend');
console.log("=== MAPPEN CHECK ===");
console.log("De server zoekt nu in dit absolute pad naar je frontend:", testPad);
console.log("Bestaat die map volgens de server?:", fs.existsSync(testPad));
if (fs.existsSync(testPad)) {
    console.log("Bestanden in die map:", fs.readdirSync(testPad));
}
console.log("====================");


/**
 * =========================================================================
 * 5. SERVER STARTEN
 * =========================================================================
 * Dit activeert de server op poort 3000. De server blijft vanaf nu 'luisteren'.
 */
app.listen(3000, () => {
    console.log("Server draait perfect op http://localhost:3000");
});