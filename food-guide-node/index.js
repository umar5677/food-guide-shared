const express = require('express');
const axios = require('axios');
const mysql = require('mysql2'); // MySQL package
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const API_KEY = 'xx̌xxxxxx';

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'places_db'
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Function to fetch places and add them to the database
const fetchAndStorePlaces = async (keyword) => {
    const location = '1.4149076394764615, 103.91065379999999'; // Latitude and longitude
    const radius = 1000; // Radius in meters
    const type = 'restaurant'; // Type of place
    const API_KEY = 'AIzaSyCDQq7OqxxxFz1N_4SSgFwuzzo00B01CR8';

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
            keyword: keyword,
            location: location,
            radius: radius,
            type: type,
            key: API_KEY
        }
    });

    const places = response.data.results.map(place => ({
        name: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        reference: place.reference,
        type: keyword
    }));

    return places;
};

app.get('/api/refresh', async (req, res) => {
    try {
        // Delete all existing records from the places table
        db.query('DELETE FROM places', (err, result) => {
            if (err) {
                console.error('Error deleting rows:', err);
                return res.status(500).json({ error: 'Failed to delete rows from database' });
            }
            console.log('All rows deleted.');

            // Fetch places for each category and insert into database
            const fastfoodPlaces = fetchAndStorePlaces('fastfood');
            const japanesePlaces = fetchAndStorePlaces('japanese');
            const halalPlaces = fetchAndStorePlaces('halal');

            // Insert all places into the database
            Promise.all([fastfoodPlaces, japanesePlaces, halalPlaces])
                .then(([fastfoodData, japaneseData, halalData]) => {
                    const allPlaces = [...fastfoodData, ...japaneseData, ...halalData];

                    // Log the result to print the data (optional)
                    console.log('Fetched and combined places data:');
                    //console.log(allPlaces);

                    // Insert each place into the database
                    allPlaces.forEach(place => {
                        const query = 'INSERT INTO places (name, latitude, longitude, reference, type) VALUES (?, ?, ?, ?, ?)';
                        const values = [place.name, place.latitude, place.longitude, place.reference, place.type];

                        db.query(query, values, (err, result) => {
                            if (err) {
                                console.error('Error inserting place:', err);
                            }
                        });
                    });

                    // Send confirmation response with the fetched data
                    res.json({
                        message: 'Database refreshed',
                        data: allPlaces // Include the fetched data in the response
                    });
                })
                .catch(error => {
                    console.error('Error fetching places:', error);
                    res.status(500).json({ error: 'Failed to fetch and store places', details: error.message });
                });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred during the refresh process', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
