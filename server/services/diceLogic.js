// Example logic you will need
function resolveAttack(attackerSoldiers, defenderSoldiers) {
  // 1. Determine number of dice
  // Attacker must leave 1 behind
  const maxAttackerDice = attackerSoldiers - 1;
  const maxDefenderDice = defenderSoldiers;
  
  // Lowest of the two
  const numDice = Math.min(maxAttackerDice, maxDefenderDice);
  
  if (numDice <= 0) return { error: "Not enough soldiers to attack" };

  // 2. Roll dice
  const attackerRolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
  const defenderRolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);

  // 3. Sort descending (Highest rolls pair against highest rolls)
  attackerRolls.sort((a, b) => b - a);
  defenderRolls.sort((a, b) => b - a);

  // 4. Compare
  let attackerLosses = 0;
  let defenderLosses = 0;

  for (let i = 0; i < numDice; i++) {
    if (attackerRolls[i] > defenderRolls[i]) {
      defenderLosses++;
    } else if (defenderRolls[i] > attackerRolls[i]) {
      attackerLosses++;
    }
    // Tie: no one loses
  }

  return { attackerRolls, defenderRolls, attackerLosses, defenderLosses };
}

// You will also need the logic for:
// - Calculating reinforcements: (countriesOwned * 2)
// - Calculating conquered soldiers: Math.max(2, Math.floor(conqueredSoldiers / 2))

/* 
 * Dice Logic for Geopolitics Game
 * Based on INF4001 Entrance Exam Brief
 */

/*
 * Rolls a single 6-sided die (returns 1-6)
 */
const rollDie = () => Math.floor(Math.random() * 6) + 1;

/**
 * Simulates a single combat phase (one roll of the dice).
 * 
 * @param {number} attackerSoldiers - Total soldiers in the attacking country
 * @param {number} defenderSoldiers - Total soldiers in the defending country
 * @returns {object} The results of the roll, including dice values, losses, and remaining soldiers.
 */
const resolveCombatPhase = (attackerSoldiers, defenderSoldiers) => {
  // 1. Attacker must leave at least 1 soldier behind
  const maxAttackerDice = attackerSoldiers - 1;
  
  // 2. Defender can use all their soldiers
  const maxDefenderDice = defenderSoldiers;

  // 3. Number of dice rolled is the least number of soldiers available to fight on either side
  const numDice = Math.min(maxAttackerDice, maxDefenderDice);

  // If the attacker has less than 2 soldiers, they cannot attack
  if (numDice <= 0) {
    return {
      error: "Not enough soldiers to attack. Attacker must have at least 2 soldiers.",
      attackerRolls: [],
      defenderRolls: [],
      attackerLosses: 0,
      defenderLosses: 0,
      newAttackerSoldiers: attackerSoldiers,
      newDefenderSoldiers: defenderSoldiers
    };
  }

  // 4. Roll the dice
  const attackerRolls = Array.from({ length: numDice }, () => rollDie());
  const defenderRolls = Array.from({ length: numDice }, () => rollDie());

  // 5. Sort descending (Highest rolls pair against highest rolls)
  // The brief says "Soldier 1 vs Soldier 1, Soldier 2 vs Soldier 2, and so on."
  // In Risk-style games, it is standard to sort highest-to-lowest so the best 
  // attackers fight the best defenders.
  attackerRolls.sort((a, b) => b - a);
  defenderRolls.sort((a, b) => b - a);

  // 6. Compare dice and count losses
  let attackerLosses = 0;
  let defenderLosses = 0;

  for (let i = 0; i < numDice; i++) {
    if (attackerRolls[i] > defenderRolls[i]) {
      defenderLosses++; // Attacker wins, defender loses a soldier
    } else if (defenderRolls[i] > attackerRolls[i]) {
      attackerLosses++; // Defender wins, attacker loses a soldier
    }
    // If they tie, neither loses a soldier, loop continues to next pair
  }

  // 7. Calculate new soldier counts
  const newAttackerSoldiers = attackerSoldiers - attackerLosses;
  const newDefenderSoldiers = defenderSoldiers - defenderLosses;

  return {
    numDice,
    attackerRolls,
    defenderRolls,
    attackerLosses,
    defenderLosses,
    newAttackerSoldiers,
    newDefenderSoldiers
  };
};

/**
 * Calculates how many soldiers are gained when a country is conquered.
 * Rule: Soldiers gained = Max(2, conquered country's soldier value / 2)
 * Note: The brief says "half that country's soldier value, rounded down".
 * "Soldier value" usually refers to the country's starting value (e.g., India = 9).
 * 
 * @param {number} countryInitialValue - The starting/base soldier value of the conquered country
 * @returns {number} Number of soldiers gained
 */
const calculateConqueredSoldiers = (countryInitialValue) => {
  const halfValue = Math.floor(countryInitialValue / 2);
  return Math.max(2, halfValue);
};

/**
 * Calculates how many reinforcements a player receives at the start of their turn.
 * Rule: 2 new soldiers for every country they currently control.
 * 
 * @param {number} countriesOwnedCount - Number of countries the player controls
 * @returns {number} Number of reinforcements
 */
const calculateReinforcements = (countriesOwnedCount) => {
  // If they control at least 1 country, they get 2 soldiers minimum
  if (countriesOwnedCount > 0) {
    return countriesOwnedCount * 2;
  }
  return 0;
};

// ==========================================
// 🧪 LOCAL TESTING BLOCK
// Run this file directly using: node diceLogic.js
// ==========================================
if (require.main === module) {
  console.log("--- Testing Combat Phase ---");
  
  // Test 1: Brief Example (10 vs 2)
  // We will force the dice rolls to match the brief's example manually for testing
  console.log("\nTest 1: Attacker 10 vs Defender 2 (Brief Example)");
  // (Note: Because we use Math.random, we can't guarantee the exact rolls, 
  // but the math logic will hold. Run it a few times to see different results)
  console.log(resolveCombatPhase(10, 2));

  // Test 2: Attacker 3 vs Defender 5 (Brief Example - should roll 2 dice)
  console.log("\nTest 2: Attacker 3 vs Defender 5");
  console.log(resolveCombatPhase(3, 5));

  // Test 3: Attacker 2 vs Defender 5 (Brief Example - should roll 1 die)
  console.log("\nTest 3: Attacker 2 vs Defender 5");
  console.log(resolveCombatPhase(2, 5));

  // Test 4: Attacker 1 (Should throw error)
  console.log("\nTest 4: Attacker 1 vs Defender 5");
  console.log(resolveCombatPhase(1, 5));

  console.log("\n--- Testing Conquered Soldiers Gain ---");
  console.log("Conquer India (value 9):", calculateConqueredSoldiers(9), "(Expected: 4)");
  console.log("Conquer Vatican City (value 1):", calculateConqueredSoldiers(1), "(Expected: 2)");

  console.log("\n--- Testing Reinforcements ---");
  console.log("Own 1 country:", calculateReinforcements(1), "(Expected: 2)");
  console.log("Own 3 countries:", calculateReinforcements(3), "(Expected: 6)");
}

// Export functions for use in your controllers
module.exports = {
  resolveCombatPhase,
  calculateConqueredSoldiers,
  calculateReinforcements
}; 
