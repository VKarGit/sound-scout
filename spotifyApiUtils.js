const axios = require('axios');
const qs = require('qs');

// Function to search for an artist on Spotify and return the artist's ID
async function searchArtist(artistName, accessToken) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const artists = response.data.artists.items;
        return artists.length > 0 ? artists[0].id : null;
    } catch (error) {
        console.error('Error searching for artist:', error);
        return null;
    }
}

// Function to retrieve the albums of a given artist
async function getArtistAlbums(artistId, accessToken) {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=50`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        return [];
    }
}

// Function to fetch the tracks from a given album
async function getAlbumTracks(albumId, accessToken) {
    const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching album tracks:', error);
        return [];
    }
}

module.exports = {
    searchArtist,
    getArtistAlbums,
    getAlbumTracks
};
