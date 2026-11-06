require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const gameRoutes = require('./routes/gameRoutes');

const app = express();


app.use(cors()); // Allow requests from your React frontend
app.use(express.json()); // Parse JSON bodies

// Connect to Database
connectDB();

// Routes
console.log("Game Routes is:", gameRoutes);
app.use('/api/game', gameRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('Geopolitics Game API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});