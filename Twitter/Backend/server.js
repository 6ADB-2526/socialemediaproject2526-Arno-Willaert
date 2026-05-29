// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
// Vertel Express dat hij de bestanden uit de frontend map live moet zetten
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Zorgt dat we JSON (en foto's) kunnen ontvangen

const USERS_FILE_PATH = './users.json';

// Hulpfunctie om gebruikers te lezen (en een testgebruiker aan te maken)
function readUsersFromFile() {
    if (!fs.existsSync(USERS_FILE_PATH)) {
        // We maken alvast één testaccount aan: Gebruikersnaam 'admin' met wachtwoord 'geheim'
        const defaultUsers = [
            { username: "admin", password: "geheim", name: "Administrator", handle: "admin" }
        ];
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), 'utf8');
        return defaultUsers;
    }
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data);
}

// Hulpfuncties voor bestandssysteem
const FILE_PATH = './tweets.json';

// Hulpfunctie om tweets VEILIG te lezen
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
        return [];
    }
}

// Hulpfunctie om tweets VEILIG te schrijven
function writeTweetsToFile(tweets) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(tweets, null, 2), 'utf8');
    } catch (error) {
        console.error("Fout bij schrijven naar tweets.json:", error);
    }
}

// 1. GET ROUTE: Tweets ophalen
app.get('/tweets', (req, res) => {
    const tweets = readTweetsFromFile();
    res.json(tweets); // Stuur de array netjes terug
});

// 2. POST ROUTE: Tweet toevoegen
app.post('/tweets', (req, res) => {
    const newTweet = req.body;
    
    // LAAD EERST de bestaande tweets in!
    const tweets = readTweetsFromFile();
    
    // Voeg de nieuwe tweet toe aan de bestaande lijst
    tweets.unshift(newTweet); // unshift zet hem bovenaan
    
    // Sla de BIJGEWERKTE lijst op
    writeTweetsToFile(tweets);
    
    res.json({ success: true, message: 'Tweet opgeslagen!' });
});

// 3. DELETE ROUTE: Verwijderen
app.delete('/tweets/:id', (req, res) => {
    try {
        const tweetIdToDelete = Number(req.params.id);
        const tweets = readTweetsFromFile();
        const opgeschoondeTweets = tweets.filter(t => t.id !== tweetIdToDelete);
        writeTweetsToFile(opgeschoondeTweets);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 4. POST ROUTE: Liken
app.post('/tweets/:id/like', (req, res) => {
    try {
        const tweetId = Number(req.params.id); // Maak een nummer van het ID uit de URL
        const tweets = readTweetsFromFile();

        // Zoek de tweet met exact dat unieke ID
        const tweet = tweets.find(t => t.id === tweetId);

        if (tweet) {
            // Toggle de like status
            if (tweet.likedByUser) {
                tweet.likes = Math.max(0, (tweet.likes || 1) - 1);
                tweet.likedByUser = false;
            } else {
                tweet.likes = (tweet.likes || 0) + 1;
                tweet.likedByUser = true;
            }

            writeTweetsToFile(tweets);
            return res.json({ success: true, likes: tweet.likes, likedByUser: tweet.likedByUser });
        } else {
            return res.status(404).json({ success: false, message: "Tweet niet gevonden." });
        }
    } catch (error) {
        console.error("Fout in backend like-route:", error);
        return res.status(500).json({ success: false });
    }
});

// 5. ROUTE: Inloggen en wachtwoord controleren
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readUsersFromFile();

        // Zoek of de gebruiker bestaat én of het wachtwoord klopt
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (user) {
            console.log(`--> Gebruiker ${user.username} succesvol ingelogd!`);
            // Stuur succes terug, mét de profielgegevens (behalve het wachtwoord!)
            res.json({ 
                success: true, 
                username: user.username, 
                name: user.name, 
                handle: user.handle 
            });
        } else {
            console.log(`--> Mislukte inlogpoging voor: ${username}`);
            res.status(401).json({ success: false, message: "Onjuiste gebruikersnaam of wachtwoord!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Serverfout bij het inloggen." });
    }
});


app.listen(3000, () => {
    console.log("Server draait perfect op http://localhost:3000");
});