const bodyParser = require("body-parser");
const path = require("path");
const express = require("express");
const axios = require('axios');
const qs = require('qs');
const { searchArtist, getArtistAlbums, getAlbumTracks } = require('./spotifyApiUtils');
require("dotenv").config({ path: path.resolve(__dirname, 'secrets/.env') });

const app = express();
const port = 443;
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static('public'));

const {MongoClient, ServerApiVersion} = require("mongodb");
const { connect } = require("http2");
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.9uto1sz.mongodb.net/?retryWrites=true&w=majority`;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const spClientId = process.env.SPOTIFY_CLIENT_ID;
const spClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
let spotifyAccessToken = null;

app.get("/", (req, res) => {
    res.render("home.ejs", 
    {trackFrame: "nothing here yet :)", 
    title: "no track rendered yet (title)", 
    album: "no track rendered yet (album)"});
});

app.post("/", async (req, res) => {
    let { artistName } = req.body;
    let trackFrame = '';
    let title = 'failure';
    let album = 'failure';

    try {
        const artistId = await searchArtist(artistName, spotifyAccessToken);
        if (!artistId) {
            trackFrame = 'Artist not found';
        } 
        else {
            const albums = await getArtistAlbums(artistId, spotifyAccessToken);
            const allTracks = (await Promise.all(albums.map(album => getAlbumTracks(album.id, spotifyAccessToken)))).flat();
            const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
            title = randomTrack.name;
            trackFrame = `<iframe src="https://open.spotify.com/embed/track/${randomTrack.id}" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
        }
    } catch (error) {
        console.error('Error:', error);
        trackFrame = 'Error in processing your request';
    }

    res.render("home.ejs", { trackFrame: trackFrame, title: title});
});

async function connectToDB() {
    try { await client.connect(); console.log("Successfully connected to database")}
    catch(e) { console.error(e); process.exit(1); }
}

async function authWithSpotify() {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const payload = qs.stringify({ grant_type: 'client_credentials' });
    const headers = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
            username: spClientId,
            password: spClientSecret
        }
    };

    try {
        const response = await axios.post(tokenUrl, payload, headers);
        spotifyAccessToken = response.data.access_token;
        console.log('Successfully authenticated with Spotify');
    } catch (error) {
        console.error('Failed to authenticate with Spotify:', error);
        process.exit(1);
    }
}

app.get("/rate", (req, res) => {
    res.render("rating.ejs");
});

app.post("/rate", async (req, res) => {
    try {
        let {title, rating} = req.body;

        const collection = client.db(dbName).collection(collectionName);

        await collection.insertOne({
            title: title,
            rating: rating
        });

        res.redirect("/");
    }
    catch(e) { console.error(e); }
});

app.get("/data", (req, res) => {
    res.render("data.ejs", {tableContents: "(empty right now)"});
});

app.post("/data", async (req, res) => {
    try {
        let {thresholdRating} = req.body;
        thresholdRating = parseFloat(thresholdRating);

        const collection = client.db(dbName).collection(collectionName);

        const wholeThing = await collection.find({}).toArray();
        const results = wholeThing.filter(result => {
            return parseFloat(result.rating) >= thresholdRating
        });

        console.log(results);

        res.render("data.ejs", {
            tableContents: results.map(result => {
                return `<tr><td>${result.title}</td><td>${result.rating}</td></tr>`
            }).join("")
        });
    }
    catch(e) { console.error(e); }
});

app.post('/clearData', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        await collection.deleteMany({});

        res.send('All data cleared successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error clearing data.');
    } finally {
        await client.close();
    }
});

async function startServer() {
    try {
        await connectToDB();
        await authWithSpotify();
        app.listen(port, () => {
            console.log(`Web server started and running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error starting the server:', error);
        process.exit(1);
    }
}

startServer();