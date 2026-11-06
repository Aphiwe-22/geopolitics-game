const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const { createGameSetup } = require('../services/gameService');
const { resolveCombatPhase, calculateConqueredSoldiers } = require('../services/diceLogic');
const { generateBattleCommentary } = require('../services/llmService');

// Creates a new game session
router.post('/create', async (req, res) => {
  try {
    const { playerName, selectedCountry } = req.body;


    const newGameData = createGameSetup(playerName, selectedCountry);

    // Save to MongoDB
    const newGame = new Game(newGameData);
    await newGame.save();


    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      game: newGame
    });

  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


router.post('/:gameId/end-turn', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findOne({ gameId });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    const currentIndex = game.players.findIndex(p => p.playerId === game.currentTurnPlayerId);
    let nextIndex = (currentIndex + 1) % game.players.length;
    
    // Safer loop: Skip dead players (only if they explicitly have isAlive === false)
    let loopCount = 0;
    while (game.players[nextIndex].isAlive === false && loopCount < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      loopCount++;
    }

    const nextPlayer = game.players[nextIndex];

    if (nextIndex <= currentIndex) {
      game.roundNumber += 1;
    }

    game.currentTurnPlayerId = nextPlayer.playerId;

    // Give reinforcements
    const countriesOwned = game.countries.filter(c => c.ownerId === nextPlayer.playerId);
    const reinforcements = countriesOwned.length * 2;
    
    if (countriesOwned.length > 0) {
      countriesOwned[0].soldiers += reinforcements;
    }

    game.history.push({
      round: game.roundNumber,
      actorId: nextPlayer.playerId,
      action: 'reinforce',
      details: { reinforcementsGiven: reinforcements }
    });

    await game.save();

    res.status(200).json({
      success: true,
      message: `Turn passed to ${nextPlayer.name}. Round ${game.roundNumber}`,
      game
    });

  } catch (error) {
    console.error("Error ending turn:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//Player attacks another country
router.post('/:gameId/attack', async (req, res) => {
  try {


    const { gameId } = req.params;
    const { attackerCountryName, defenderCountryName, action } = req.body; 
    // action can be 'roll' (do one combat phase) or 'stop' (end attack)

    // 1. Find the game
    const game = await Game.findOne({ gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    // 2. Find the countries involved
    const attackerCountry = game.countries.find(c => c.name === attackerCountryName);
    const defenderCountry = game.countries.find(c => c.name === defenderCountryName);

    if (!attackerCountry || !defenderCountry) {
      return res.status(400).json({ error: 'Country not found' });
    }

    // 3. Validate it's the player's turn and they own the attacker
    if (game.currentTurnPlayerId !== attackerCountry.ownerId) {
      return res.status(400).json({ error: 'It is not your turn or you do not own this country.' });
    }
    if (attackerCountry.ownerId === defenderCountry.ownerId) {
      return res.status(400).json({ error: 'You cannot attack your own country.' });
    }

    // 4. Handle the action
    if (action === 'stop') {
       // Player chooses to stop attacking
       return res.status(200).json({ success: true, message: 'Attack stopped.', game });
    }

    // 5. Execute ONE combat phase
    const battleResult = resolveCombatPhase(attackerCountry.soldiers, defenderCountry.soldiers);

    if (battleResult.error) {
      return res.status(400).json({ error: battleResult.error });
    }

    // Apply losses
    attackerCountry.soldiers = battleResult.newAttackerSoldiers;
    defenderCountry.soldiers = battleResult.newDefenderSoldiers;

    let conquered = false;
    let soldiersGained = 0;

    // Check if defender was conquered
    if (defenderCountry.soldiers === 0) {
      conquered = true;
      
      // Calculate how many soldiers move into the new country
      soldiersGained = Math.max(2, Math.floor(defenderCountry.soldiers / 2));
      
      // Change ownership
      defenderCountry.ownerId = attackerCountry.ownerId;
      defenderCountry.soldiers = soldiersGained;
      
      // Remove the conquered soldiers from the attacker's country 
      // (Assuming the gained soldiers move from the attacker, up to the max available)
      const soldiersToMove = Math.min(soldiersGained, attackerCountry.soldiers - 1);
      attackerCountry.soldiers -= soldiersToMove;
      defenderCountry.soldiers = soldiersToMove;
    }

     const commentaryData = {
      attacker: attackerCountryName,
      defender: defenderCountryName,
      attackerRolls: battleResult.attackerRolls,
      defenderRolls: battleResult.defenderRolls,
      attackerLosses: battleResult.attackerLosses,
      defenderLosses: battleResult.defenderLosses,
      conquered: conquered
    };
    
   let aiCommentary = "The battle raged on...";
    try {
      aiCommentary = await generateBattleCommentary(commentaryData);
    } catch (aiError) {
      console.log("⚠️ AI failed, using fallback text:", aiError.message);
    }

    // 6. Save history
    game.history.push({
      round: game.roundNumber,
      actorId: attackerCountry.ownerId,
      action: 'attack',
      details: {
        attacker: attackerCountryName,
        defender: defenderCountryName,
        dice: battleResult,
        conquered,
        aiCommentary
      }
    });

    // 7. Save to DB
    await game.save();

    // 8. Return updated game and the battle details
    res.status(200).json({
      success: true,
      battleResult,
      conquered,
      aiCommentary,
      game // Send the whole updated game back so the frontend can re-render
    });

  } catch (error) {
    console.error("Error in attack route:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/game/:gameId/npc-attack
// A simplified attack route for NPCs
router.post('/:gameId/npc-attack', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { attackerCountryName, defenderCountryName } = req.body;

    const game = await Game.findOne({ gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const attacker = game.countries.find(c => c.name === attackerCountryName);
    const defender = game.countries.find(c => c.name === defenderCountryName);

    if (!attacker || !defender) return res.status(400).json({ error: 'Country not found' });

    const battleResult = resolveCombatPhase(attacker.soldiers, defender.soldiers);
    if (battleResult.error) return res.status(400).json({ error: battleResult.error });

    attacker.soldiers = battleResult.newAttackerSoldiers;
    defender.soldiers = battleResult.newDefenderSoldiers;

    let conquered = false;
    if (defender.soldiers === 0) {
      conquered = true;
      defender.ownerId = attacker.ownerId;
      defender.soldiers = 1; 
      attacker.soldiers -= 1;
    }

      const commentaryData = {
      attacker: attackerCountryName,
      defender: defenderCountryName,
      attackerRolls: battleResult.attackerRolls,
      defenderRolls: battleResult.defenderRolls,
      attackerLosses: battleResult.attackerLosses,
      defenderLosses: battleResult.defenderLosses,
      conquered: conquered
    };


     let aiCommentary = "The battle raged on..."; 
    try {
      aiCommentary = await generateBattleCommentary(commentaryData);
    } catch (aiError) {
      console.log("AI failed:", aiError.message);
     
    }

    game.history.push({
      round: game.roundNumber,
      actorId: attacker.ownerId,
      action: 'attack',
      details: {
        attacker: attackerCountryName,
        defender: defenderCountryName,
        dice: battleResult,
        conquered,
        aiCommentary
      }
    });

    await game.save();
    res.status(200).json({ success: true, battleResult, conquered, aiCommentary, game });
  } catch (error) {
    console.error("NPC Attack Error:", error);
    res.status(500).json({ error: 'Server Error' });
  }
});


// GET /api/game/:gameId
// Fetches an existing game state
router.get('/:gameId', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/game/:gameId/transfer
router.post('/:gameId/transfer', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { fromCountryName, toCountryName, amount } = req.body;

    const game = await Game.findOne({ gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.currentTurnPlayerId !== 'player_1') {
      return res.status(400).json({ error: 'It is not your turn.' });
    }

    const fromCountry = game.countries.find(c => c.name === fromCountryName);
    const toCountry = game.countries.find(c => c.name === toCountryName);

    if (!fromCountry || !toCountry) {
      return res.status(400).json({ error: 'Country not found.' });
    }

    if (fromCountry.ownerId !== 'player_1' || toCountry.ownerId !== 'player_1') {
      return res.status(400).json({ error: 'You can only transfer soldiers between your own countries.' });
    }

    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'You must transfer at least 1 soldier.' });
    }
    
    // Ensure at least 1 soldier stays behind
    if (fromCountry.soldiers - transferAmount < 1) {
      return res.status(400).json({ error: `You must leave at least 1 soldier behind in ${fromCountryName}.` });
    }

    fromCountry.soldiers -= transferAmount;
    toCountry.soldiers += transferAmount;

    game.history.push({
      round: game.roundNumber,
      actorId: 'player_1',
      action: 'transfer',
      details: { from: fromCountryName, to: toCountryName, amount: transferAmount }
    });

    await game.save();

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${transferAmount} soldiers.`,
      game
    });

  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({ error: 'Server Error: ' + error.message });
  }
});

module.exports = router;