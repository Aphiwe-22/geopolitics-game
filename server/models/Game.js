const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['setup', 'active', 'finished'], default: 'setup' },
  players: [{
    playerId: { type: String, required: true },           // name of player('player1' or 'npc1')
    name: { type: String, required: true },
    isNPC: { type: Boolean, default: false },
    countriesOwned: [String], // e.g., ['South Africa', 'India']
    isAlive: { type: Boolean, default: false },
  }],
  countries: [{
    name: { type: String, required: true },
    ownerId: { type: String, required: true },      // Links to player.id
    soldiers:  { type: Number, required: true, min: 0 },
    basePopulation: { type: Number, required: true }  // Used to calculate initial soldiers
  }],
  currentTurnPlayerId: { type: String, default: null },
  roundNumber: { type: Number, default: 0 },
  history: [{
    round: Number,
    actor: String,
    action: { type: String, enum: ['attack', 'transfer', 'end_turn', 'reinforce'] },
    details:  mongoose.Schema.Types.Mixed,    
    timestamp:{ type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);