

// Countries approximate populations
const COUNTRY_DATA = [
  { name: "India", population: 1428627663 },
  { name: "China", population: 1425671352 },
  { name: "USA", population: 339996563 },
  { name: "Indonesia", population: 277534122 },
  { name: "Pakistan", population: 240485658 },
  { name: "Nigeria", population: 223804632 },
  { name: "Brazil", population: 216422446 },
  { name: "Bangladesh", population: 172954319 },
  { name: "Russia", population: 144444359 },
  { name: "Mexico", population: 128455567 },
  { name: "South Africa", population: 60414495 }, //Starting country
  { name: "France", population: 64756584 },
  { name: "UK", population: 67736802 },
  { name: "Vatican City", population: 800 } // Smallest country for testing edge cases
];


 //Calculates starting soldiers based on population tiers.
 
const calculateStartingSoldiers = (population) => {
  // Adjust this math based on the table in your PDF!
  const soldiers = Math.floor(population / 10000000); 
  return Math.max(1, soldiers);
};
//More logic needs to be added

/**
 * Creates the initial game state.
 */
const createGameSetup = (playerName, selectedCountryName) => {
  // 1. Find the player's chosen country
  const playerCountry = COUNTRY_DATA.find(c => c.name === selectedCountryName) || COUNTRY_DATA.find(c => c.name === "South Africa");
  
  // 2. Randomly select 9 other countries
  const availableCountries = COUNTRY_DATA.filter(c => c.name !== playerCountry.name);
  const shuffled = availableCountries.sort(() => 0.5 - Math.random());
  const npcCountries = shuffled.slice(0, 9);

  const allCountries = [playerCountry, ...npcCountries];

  // 3. Setup Players (1 Human, 9 NPCs)
  const players = [{
    playerId: 'player_1',
    name: playerName || 'Commander',
    isNPC: false,
    isAlive: true,
    color: 'blue'
  }];

  // 4. Setup Countries & Assign to Players
  const gameCountries = allCountries.map((country, index) => {
    const isPlayer = country.name === playerCountry.name;
    
    // Create an NPC for every non-player country
    
    if (!isPlayer) {
      players.push({
        playerId: `npc_${index}`,
        name: `General of ${country.name}`,
        isNPC: true,
        isAlive: true,
        color: `hsl(${index * 36}, 70%, 50%)` // Generate distinct colors
      });
    }

    return {
      name: country.name,
      ownerId: isPlayer ? 'player_1' : `npc_${index}`,
      soldiers: calculateStartingSoldiers(country.population),
      basePopulation: country.population
    };
  });

  // 5. Randomly decide who goes first
  const firstTurnIndex = Math.floor(Math.random() * players.length);
  const firstPlayer = players[firstTurnIndex];

  return {
    gameId: `game_${Date.now()}`,
    status: 'active',
    players,
    countries: gameCountries,
    currentTurnPlayerId: firstPlayer.playerId,
    roundNumber: 1,
    history: []
  };
};

module.exports = {
  COUNTRY_DATA,
  createGameSetup,
  calculateStartingSoldiers
};