// backend/server.js

/**
 * =========================================================================
 * 1. IMPORTS & INITIALISATIE (DE SKELETBOUW)
 * =========================================================================
 * Node.js werkt modulair. Standaard kan een leeg script niks. Hier importeren we 
 * de nodige bibliotheken (pakketten) om van dit script een volwaardige webserver te maken.
 */

// EXPRESS: Dit is de motor van je backend. Het vangt HTTP-verzoeken op (zoals wanneer iemand 
// een tweet plaatst of de tijdlijn laadt) en zorgt dat deze bij de juiste code terechtkomen.
const express = require('express'); 

// CORS (Cross-Origin Resource Sharing): Essensjele beveiliging. Browsers blokkeren standaard 
// verzoeken tussen verschillende poorten (bijv. frontend op Live Server poort 5500 die praat 
// met backend op poort 3000). CORS vertelt de browser: "Dit verzoek is veilig, laat maar door."
const cors = require('cors'); 

// FILE SYSTEM (fs): Een ingebouwde Node.js module. Omdat we geen zware SQL/MongoDB database 
// gebruiken, fungeert deze module als onze database-manager om fysieke tekstbestanden te manipuleren.
const fs = require('fs'); 

// PATH: Helpt bij het bouwen van mapplokaties. Windows gebruikt backslashes (\) en Mac/Linux 
// gebruiken slashes (/). `path.join` zorgt ervoor dat je server op elk besturingssysteem werkt.
const path = require('path'); 

// INSTANTIE: We starten de Express-applicatie op en slaan deze op in de constante `app`.
const app = express(); 


/**
 * =========================================================================
 * 2. MIDDLEWARE CONFIGURATIE (DE DOUANE)
 * =========================================================================
 * Middleware-functies zijn stappen waar een binnenkomend verzoek *altijd* eerst doorheen 
 * moet lopen voordat het een API-route raakt. Zie het als een douanecontrole.
 */

// DOUANEPOST 1: Keur cross-origin verzoeken goed via de CORS-regels.
app.use(cors()); 

// DOUANEPOST 2 (JSON PARSER): Als de frontend data stuurt (bijv. een nieuwe tweet), komt dit 
// binnen als een rauwe stroom tekst. Deze parser vertaalt die tekst automatisch naar een 
// bruikbaar JavaScript-object (`req.body`). De limiet staat op 10 megabyte omdat afbeeldingen 
// die omgezet zijn naar Base64-tekst erg lang en zwaar kunnen zijn.
app.use(express.json({ limit: '10mb' }));

// STATIC SERVER: Dit vertelt Express dat als iemand vraagt om een bestand dat simpelweg in 
// de frontend-map staat (zoals een CSS-bestand of een plaatje), de server dit direct mag 
// teruggeven zonder dat we daar een aparte route voor hoeven te schrijven.
app.use(express.static(path.join(__dirname, '../frontend')));

// ROOT ROUTE: Als een gebruiker puur naar http://localhost:3000/ surft, triggert deze GET-route.
// De server reageert door de HTML-basis (`index.html`) naar de browser te sturen via `res.sendFile`.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});


/**
 * =========================================================================
 * 3. HULPFUNCTIES VOOR DATABASE (JSON BESTANDEN ALS DATA-OPSLAG)
 * =========================================================================
 * Dit is onze 'flat-file database'. In plaats van een echte database-server, slaan we 
 * alles op in gewone tekstbestanden. Deze functies regelen het lezen en schrijven.
 */

const USERS_FILE_PATH = './users.json'; // Harde schijf lokatie voor de accounts.
const FILE_PATH = './tweets.json';       // Harde schijf lokatie voor de tweets.

/**
 * Leest de gebruikerslijst. Als het bestand nog niet bestaat, maakt hij direct 
 * een standaard administrator-account aan zodat de database nooit leeg start.
 */
function readUsersFromFile() {
    // INITIALISATIE: `fs.existsSync` controleert of het bestand fysiek op de schijf staat.
    if (!fs.existsSync(USERS_FILE_PATH)) {
        const defaultUsers = [
            { username: "admin", password: "geheimAdmin!", name: "Administrator", handle: "admin", userAvatar: "" }
        ];
        // OMDRAAIEN (SERIALISATIE): `JSON.stringify` zet de array om naar platte tekst.
        // De `null, 2` zorgt voor nette regeleinden en inspringingen (indents) in het bestand.
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), 'utf8');
        return defaultUsers; 
    }
    // BESTAAT WEL: Lees de rauwe tekst in en vertaal het via `JSON.parse` terug naar een JavaScript-array.
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data);
}

/**
 * Leest alle tweets uit tweets.json.
 * Ingepakt in een try-catch blok: als iemand handmatig een typefout maakt in tweets.json,
 * vangt de catch dit op en blijft de server in de lucht in plaats van dat hij crasht.
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
        console.error("Fout bij lezen tweets.json:", error);
        return []; // Veiligheids-fallback: stuur een lege lijst terug.
    }
}

/**
 * Schrijft de actuele array met tweets fysiek terug naar de harde schijf.
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
 * 4. API ROUTES (GET, POST, PUT, DELETE)
 * =========================================================================
 * Dit zijn de endpoints. De frontend vuurt hier 'fetch'-verzoeken op af. 
 * `req` (request) bevat de data van de frontend; `res` (response) is wat we terugsturen.
 */

/**
 * 1. GET /tweets - Tijdlijn ophalen
 * Stuurt simpelweg de hele lijst met opgeslagen tweets als JSON naar de frontend.
 */
app.get('/tweets', (req, res) => {
    const tweets = readTweetsFromFile(); 
    res.json(tweets); // Stuurt status 200 (OK) en de data terug.
});

/**
 * 2. POST /tweets - Nieuwe tweet opslaan
 * Ontvangt een tweet-object en zet deze bovenaan de lijst.
 */
app.post('/tweets', (req, res) => {
    const newTweet = req.body;           // Het object dat de frontend via `body: JSON.stringify(...)` stuurde.
    const tweets = readTweetsFromFile(); 
    
    // UNSHIFT LOGICA: In plaats van `.push()` (achteraan aansluiten), gebruiken we `.unshift()`. 
    // Hierdoor komt de allernieuwste tweet direct op index 0 (vooraan) te staan, zodat hij 
    // bovenaan de tijdlijn verschijnt.
    tweets.unshift(newTweet); 
    
    writeTweetsToFile(tweets); 
    res.json({ success: true, message: 'Tweet opgeslagen!' }); 
});

/**
 * 3. DELETE /tweets/:id - Tweet permanent vernietigen
 * Het ID wordt als variabele parameter uit de URL gevist via `req.params.id`.
 */
app.delete('/tweets/:id', (req, res) => {
    try {
        // TYPE CONVERSIE: Parameters uit de URL komen ALTIJD binnen als tekst (string). 
        // Omdat ons tweet-ID een getal (timestamp) is, moeten we er expliciet een getal van maken via `Number()`.
        const tweetIdToDelete = Number(req.params.id);
        const tweets = readTweetsFromFile();
        
        // ARRAY OPSCHONING: Filter maakt een nieuwe array aan. Hij loopt door alle tweets en zegt: 
        // "Als het ID NIET gelijk is aan het te verwijderen ID, mag de tweet blijven."
        const opgeschoondeTweets = tweets.filter(t => t.id !== tweetIdToDelete);
        
        writeTweetsToFile(opgeschoondeTweets); 
        res.json({ success: true });            
    } catch (error) {
        // STATUS 500: Als er een interne fout optreedt, sturen we een 500-status (Internal Server Error) 
        // zodat de frontend weet dat de actie is mislukt.
        res.status(500).json({ success: false }); 
    }
});

/**
 * 4. POST /tweets/:id/like - Like-status omkeren (Toggle)
 * Voegt een gebruikersnaam toe aan de likes-lijst of haalt deze juist weg.
 */
app.post('/tweets/:id/like', (req, res) => {
    try {
        const tweetId = parseInt(req.params.id);
        const { username } = req.body; 

        // REQUEST VALIDATIE: Als de frontend vergeet de naam van de liker mee te sturen, 
        // stoppen we direct en sturen we status 400 (Bad Request).
        if (!username) {
            return res.status(400).json({ success: false, message: "Geen gebruikersnaam meegegeven." });
        }

        const tweets = readTweetsFromFile();
        const tweet = tweets.find(t => t.id === tweetId);

        if (!tweet) {
            return res.status(404).json({ success: false, message: "Tweet niet gevonden." });
        }

        // BACKWARD COMPATIBILITY: Mocht er een oude tweet in het bestand staan waarbij 
        // 'likes' nog gewoon een getal was (bijv. `likes: 0`), dan overschrijven we dit 
        // direct met een lege array zodat de code hierna niet vastloopt.
        if (!Array.isArray(tweet.likes)) {
            tweet.likes = [];
        }

        // LIKER ZOEKEN: `indexOf` zoekt naar de naam in de lijst. Als de naam er niet in staat, 
        // geeft hij `-1` terug. Als hij er wél in staat, geeft hij de positie (0, 1, 2, etc.) terug.
        const userIndex = tweet.likes.indexOf(username);
        let likedByUser = false;

        if (userIndex === -1) {
            // SCENARIO A: Gebruiker heeft nog niet geliked -> Voeg de naam toe via `.push()`.
            tweet.likes.push(username);
            likedByUser = true;
            console.log(`--> ${username} heeft tweet ${tweetId} geliked`);
        } else {
            // SCENARIO B: Gebruiker had al wel geliked -> Verwijder exact 1 element vanaf de gevonden positie via `.splice()`.
            tweet.likes.splice(userIndex, 1);
            likedByUser = false;
            console.log(`--> ${username} heeft de like van tweet ${tweetId} ingetrokken`);
        }

        writeTweetsToFile(tweets);

        // Geef het resultaat terug, inclusief het nieuwe totale aantal likes (de lengte van de array).
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
 * 5. POST /login - Gebruiker verifiëren
 * Controleert de inloggegevens tegen de database.
 */
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body; 
        const users = readUsersFromFile();

        // ZOEKLOGICA: We zoeken naar een account waarbij de gebruikersnaam (omgezet naar kleine letters) 
        // klopt én waarbij het wachtwoord exact overeenkomt.
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (user) {
            console.log(`--> Gebruiker ${user.username} succesvol ingelogd!`);
            
            // SECURITY HOOGTEPUNT: We sturen de accountgegevens terug naar de browser, 
            // maar we laten het wachtwoord bewust weg uit het antwoord object. 
            // Wachtwoorden horen nooit onnodig over het netwerk te zwerven!
            res.json({ 
                success: true, 
                username: user.username, 
                name: user.name, 
                handle: user.handle,
                userAvatar: user.userAvatar || "" 
            });
        } else {
            console.log(`--> Mislukte inlogpoging voor: ${username}`);
            // STATUS 401 (Unauthorized): De inloggegevens zijn onjuist.
            res.status(401).json({ success: false, message: "Onjuiste gebruikersnaam of wachtwoord!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Serverfout bij het inloggen." });
    }
});

/**
 * 6. POST /register - Nieuw account registreren
 * Valideert de invoer en voegt een nieuwe gebruiker toe aan users.json.
 */
app.post('/register', (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Wachtwoord is verplicht.' });
        }

        // STRENGE BACKEND VALIDATIE 1: Lengtecontrole. 
        // Zelfs als de frontend dit al controleert, herhalen we dit op de backend. 
        // Een slimme hacker kan de frontend immers omzeilen!
        if (password.length < 12) {
            return res.status(400).json({ success: false, message: 'Wachtwoord moet minimaal 12 tekens lang zijn.' });
        }

        // STRENGE BACKEND VALIDATIE 2: Speciaal teken check via RegEx.
        const speciaalTekenRegex = /[^a-zA-Z0-9]/;
        if (!speciaalTekenRegex.test(password)) {
            return res.status(400).json({ success: false, message: 'Wachtwoord moet minimaal 1 speciaal teken bevatten.' });
        }

        const users = readUsersFromFile();

        // UNIEKHEIDSCHECK: Voorkom dat twee mensen exact dezelfde gebruikersnaam registreren.
        const bestaatAl = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (bestaatAl) {
            return res.status(400).json({ success: false, message: 'Gebruikersnaam bestaat al' });
        }

        // CONSTRUCTIE: We bouwen het profiel-object. 
        // De Twitter-handle wordt via `.replace(/\s/g, '')` ontdaan van eventuele spaties.
        const nieuweGebruiker = {
            name: name,
            username: username,
            password: password, 
            handle: username.toLowerCase().replace(/\s/g, ''),
            userAvatar: "" 
        };

        users.push(nieuweGebruiker); 
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8'); 

        res.json({ success: true, message: 'Account succesvol aangemaakt!' });
    } catch (error) {
        console.error("Fout bij registratie:", error);
        res.status(500).json({ success: false, message: "Serverfout bij registreren." });
    }
});

/**
 * 7. POST /update-avatar - Profielfoto opslaan
 * Slaat de zware base64-string van de profielfoto op in het juiste gebruikersprofiel.
 */
app.post('/update-avatar', (req, res) => {
    try {
        const { username, avatarData } = req.body; 

        if (!username || !avatarData) {
            return res.status(400).json({ success: false, message: "Gegevens missen." });
        }

        const users = readUsersFromFile();
        // FLEXIBELE LOOKUP: Zoekt de gebruiker op basis van zijn unieke username óf zijn display-naam.
        const user = users.find(u => u.username === username || u.name === username);

        if (!user) {
            return res.status(404).json({ success: false, message: "Gebruiker niet gevonden." });
        }

        // Overschrijf de avatar variabele met de nieuwe fotostring en schrijf weg naar de harde schijf.
        user.userAvatar = avatarData;
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8'); 

        res.json({ success: true, message: "Profielfoto succesvol bijgewerkt!", avatar: avatarData });
    } catch (error) {
        console.error("Fout bij updaten profielfoto:", error);
        res.status(500).json({ success: false, message: "Serverfout." });
    }
});

/**
 * 8. PUT /tweets/:id/hide - Status 'hidden' omschakelen
 * Wordt getriggerd als de eigenaar van een tweet op het oogje klikt om een bericht te verbergen/tonen.
 */
app.put('/tweets/:id/hide', (req, res) => {
    try {
        const tweetId = req.params.id;
        console.log(`[HIDE] Poging om tweet met ID te verbergen: ${tweetId}`);
        
        const tweets = readTweetsFromFile();
        
        // ZACHTE VERGELIJKING (==): We vergelijken het ID met twee is-tekens. 
        // Dit zorgt ervoor dat de vergelijking slaagt, zelfs als het ene ID een String 
        // is ('171627...') en het andere een Number (171627...).
        const doelTweet = tweets.find(t => t.id == tweetId);

        if (!doelTweet) {
            console.log(`[HIDE] WAARSCHUWING: Tweet met ID ${tweetId} is NIET gevonden!`);
            return res.status(404).json({ success: false, message: "Tweet niet gevonden" });
        }

        // TOGGLE STATUS: De uitroepteken (`!`) keert een boolean om. 
        // Als hidden `false` was, wordt het nu `true`, en vice versa.
        doelTweet.hidden = !doelTweet.hidden;
        console.log(`[HIDE] Status succesvol omgezet naar hidden = ${doelTweet.hidden}`);

        writeTweetsToFile(tweets); 
        
        // Geef de nieuwe status terug aan de frontend zodat de interface direct mee kan veranderen.
        res.json({ success: true, hidden: doelTweet.hidden });

    } catch (error) {
        // Uitgebreide foutrapportage in de Node-terminal mocht er onverhoopt iets misgaan.
        console.error("=== CRUCIALE FOUT IN PUT /tweets/:id/hide ===");
        console.error(error);
        console.error("============================================");
        res.status(500).json({ success: false, message: "Serverfout bij het verbergen." });
    }
});


// DIAGNOSTISCHE TEST-CODE
// Dit blokje code voert zichzelf direct en eenmalig uit op de achtergrond zodra je 
// de server opstart in de terminal. Het is een 'sanity check' die verifieert 
// of je mappenstructuur klopt en of de server je frontend-map wel echt kan zien staan.
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
 * 5. SERVER STARTEN (DE LUISTER-STAND)
 * =========================================================================
 * Tot slot vertellen we de applicatie op welke netwerkpoort hij moet gaan opereren.
 */
app.listen(3000, () => {
    // Zodra dit logje in je terminal verschijnt, staat de server officieel 'aan' 
    // en blijft hij oneindig lang luisteren naar binnenkomende verzoeken.
    console.log("Server draait perfect op http://localhost:3000");
});