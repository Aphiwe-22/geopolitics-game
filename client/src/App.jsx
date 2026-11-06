import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import GameMap from './components/GameMap';

  
// Map countries to an emoji "animal/icon"
const COUNTRY_ICONS = {
  "South Africa": "🇿🇦",
  "India": "🇮🇳",
  "China": "🇨🇳",
  "USA": "🇺🇸",
  "Brazil": "🇧🇷",
  "UK": "🇬🇧",
  "Russia": "🇷🇺",
  "Mexico": "🇲🇽",
  "Indonesia": "🇮🇩",
  "Nigeria": "🇳🇬",
  "Bangladesh": "🇧🇩",
  "France": "🇫🇷",
  "Vatican City": "🇻🇦"
};

const Die = ({ value, isAttacker }) => {
  // Standard dice dots (pips) layout
  const diceFaces = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  return (
    <div className={`die ${isAttacker ? 'die-attacker' : 'die-defender'}`}>
      {diceFaces[value]?.map((pos, i) => (
        <div key={i} className={`pip ${pos}`}></div>
      ))}
    </div>
  );
};

const getCountryIcon = (countryName) => COUNTRY_ICONS[countryName] || "🌍";

function App() {
  const [isFastForward, setIsFastForward] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('South Africa');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [selectedDefender, setSelectedDefender] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [commanderAvatar, setCommanderAvatar] = useState('/soldier.png');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [actionMode, setActionMode] = useState('attack'); // 'attack' or 'transfer'
  const [transferAmount, setTransferAmount] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCommentary, setShowCommentary] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

   useEffect(() => {
    if (showCommentary) {
      const timer = setTimeout(() => setShowCommentary(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [showCommentary]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
    // This ref prevents the NPC from triggering multiple times for the same turn
  const npcProcessingRef = useRef(false);

     // --- NPC AUTOMATION ---
  useEffect(() => {
    // If it's the player's turn, or game over, reset the lock and do nothing.
    if (!gameData || gameData.currentTurnPlayerId === 'player_1' || gameData.status === 'finished') {
      npcProcessingRef.current = false; 
      return;
    }

    // If an NPC is already processing a turn, don't start another one.
    if (npcProcessingRef.current) return;

    // Lock it!
    npcProcessingRef.current = true;

    const npcTurn = async () => {
      setIsActionLoading(true);
      
      const currentNpcId = gameData.currentTurnPlayerId;
      const myCountries = gameData.countries.filter(c => c.ownerId === currentNpcId && c.soldiers > 1);
      const enemyCountries = gameData.countries.filter(c => c.ownerId !== currentNpcId);

      if (myCountries.length > 0 && enemyCountries.length > 0) {
        const attacker = myCountries.sort((a, b) => b.soldiers - a.soldiers)[0];
        const defender = enemyCountries.sort((a, b) => a.soldiers - b.soldiers)[0];

        try {
          const response = await axios.post(`https://geopolitics-backend-sqjr.onrender.com/api/game/${gameData.gameId}/npc-attack`, {
            attackerCountryName: attacker.name,
            defenderCountryName: defender.name
          });
          
          setGameData(response.data.game);
          


          const newLog = {
            ...response.data.battleResult,
            isNpc: true,
            npcName: attacker.name,
            aiCommentary: response.data.aiCommentary  || "The battle raged on...",
             defenderCountry: defender.name
          };
          
          setBattleLog(prev => [newLog, ...prev]);

             // Trigger the Popup for NPC attacks too!
          setShowCommentary(response.data.aiCommentary || "The battle raged on...");

        } catch (error) {
          console.error("NPC failed to attack:", error);
        }
      }

      //fast forward option to skip the 2.5 second wait
      const delay = isFastForward ? 300 : 3000; 

      // Wait 2.5 seconds before ending the turn
      setTimeout(async () => {
        try {
          const endTurnRes = await axios.post(`https://geopolitics-backend-sqjr.onrender.com/api/game/${gameData.gameId}/end-turn`);
          setGameData(endTurnRes.data.game);
        } catch (error) {
          console.error("NPC failed to end turn:", error);
        }
        setIsActionLoading(false);
        // Unlock so the next NPC can go
        npcProcessingRef.current = false; 
      }, delay); 
    };

    npcTurn();

  }, [gameData, isFastForward]);


    //User Authentication with Access Code  
    const handleLogin = (e) => {
    e.preventDefault();
    if (accessCode === 'warroom2027') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError("Invalid Access Code. Hint: warroom2027");
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Connect to our Express backend
      const response = await axios.post('https://geopolitics-backend-sqjr.onrender.com/api/game/create', {
        playerName,
        selectedCountry
      });
      
      // Save the massive game JSON object to React state
      setGameData(response.data.game);
    } catch (error) {
      console.error("Error starting game:", error);
      setError("Failed to start game. Is your backend running?");
    }
    setLoading(false);
  };

  

    const handleAttack = async () => {
    if (!selectedAttacker || !selectedDefender) return  setSuccessMessage("Select an attacker and a defender first!");
    
    setIsActionLoading(true);
    try {
      const response = await axios.post(`https://geopolitics-backend-sqjr.onrender.com/api/game/${gameData.gameId}/attack`, {
        attackerCountryName: selectedAttacker,
        defenderCountryName: selectedDefender,
        action: 'roll'
      });

       console.log("Backend Response:", response.data);

      if (response.data.success) {
        setGameData(response.data.game);

          const textToShow = response.data.aiCommentary || "The battle raged on...";
        // Save the battle details to show in the UI

      
       const newLog = {
          ...response.data.battleResult,
          aiCommentary: textToShow,
          defenderCountry: selectedDefender
        };
        
        setBattleLog(prev => [newLog, ...prev]);
        
        
        // Clear selection if the defender was conquered
        if (response.data.conquered) {
          setSelectedDefender(null);
          setSelectedAttacker(null);
        }

    // Check if the attacker has conquered the whole world
    const attackerOwnedCountries = game.countries.filter(c => c.ownerId === attackerCountry.ownerId);
    if (attackerOwnedCountries.length === game.countries.length) {
      game.status = 'finished';
    }
      }
    } catch (error) {
      console.error("Attack Error Details:", error);
      
      // If we get an error, but the AI text somehow made it through in the error response:
      if (error.response?.data?.aiCommentary) {
        setShowCommentary(error.response.data.aiCommentary);
      } else {
        setShowCommentary("Connection lost... The battle raged on.");
      }
    }
    setIsActionLoading(false);
  };

  useEffect(() => {
    if (battleLog.length > 0) {
      setShowCommentary(battleLog[0].aiCommentary);
    }
  }, [battleLog]);
  

  //Transfer soldiers between two countries
    const handleTransfer = async () => {
    if (!selectedAttacker || !selectedDefender) return  setSuccessMessage("Select a source and target country first.");
    
    setIsActionLoading(true);
    try {
      const response = await axios.post(`https://geopolitics-backend-sqjr.onrender.com/api/game/${gameData.gameId}/transfer`, {
        fromCountryName: selectedAttacker,
        toCountryName: selectedDefender,
        amount: transferAmount
      });

      if (response.data.success) {
        setGameData(response.data.game);
        setSelectedAttacker(null);
        setSelectedDefender(null);
        setTransferAmount(1);
        setSuccessMessage(response.data.message);
      }
    } catch (error) {
      console.error("Transfer Error:", error);

      if (error.response && error.response.data && error.response.data.error) {
        setSuccessMessage(error.response.data.error);
      } else {
        // Fallback if the server crashed
        setSuccessMessage("Error transferring soldiers");
      }
    }
    setIsActionLoading(false);
  };
    const handleEndTurn = async () => {
    setIsActionLoading(true);
    try {
      const response = await axios.post(`https://geopolitics-backend-sqjr.onrender.com/api/game/${gameData.gameId}/end-turn`);
      if (response.data.success) {
        setGameData(response.data.game);
        setSelectedAttacker(null);
        setSelectedDefender(null);
      }
    } catch (error) {
      console.error(error);
      setSuccessMessage("Error ending turn");
    }
    setIsActionLoading(false);
  };

  

  // Game interface when gameData is available
      
  if (gameData) {

    if (gameData.status === 'finished') {
      const winner = gameData.players.find(p => p.playerId === gameData.currentTurnPlayerId);
      return (
        <div className="App" style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1> GAME OVER </h1>
          <h2>{winner?.name || 'A Commander'} has conquered the world!</h2>
          <button onClick={() => setGameData(null)} className="quit-btn" style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.2rem' }}>
            Return to Menu
          </button>
        </div>
      );
    }

    const isMyTurn = gameData.currentTurnPlayerId === 'player_1';
    const myCountries = gameData.countries.filter(c => c.ownerId === 'player_1');
    const isEliminated = myCountries.length === 0;
    const countriesOwned = myCountries.length;
    const totalCountries = gameData.countries.length; // This will be 10
    const progressPercentage = (countriesOwned / totalCountries) * 100;
    
    // Calculate Player Stats
    let battlesWon = 0;
    let soldiersLost = 0;
    if (gameData.history) {
      gameData.history.forEach(event => {
        if (event.action === 'attack' && event.actorId === 'player_1') {
          if (event.details.conquered) battlesWon++;
          if (event.details.dice) {
            soldiersLost += event.details.dice.attackerLosses;
          }
        }
      });
    }

    return (
      <div className="App">
                {/* 1. HEADER */}
        <div className="header">
          
          {/* HAMBURGER MENU (Grid Column 1) */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            style={{
              background: '#1a252f', 
              border: '2px solid #ecf0f1', 
              borderRadius: '8px',
              fontSize: '1.5rem', 
              cursor: 'pointer', 
              padding: '5px 12px',
              color: '#ecf0f1',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
              width: '50px',
              height: '50px'
            }}
          >
            ☰
          </button>

          {/* CENTER TITLE  */}
          <div className="title-section">
            <h1>
              <img 
                src={commanderAvatar} 
                alt="Avatar" 
                style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #8b5a2b', objectFit: 'cover' }} 
              />
              War Room: {playerName}
            </h1>
            <h2 style={{ margin: '5px 0 0 0', color: '#bdc3c7', fontSize: '1.2rem' }}>
              Starting Country: {selectedCountry} {getCountryIcon(selectedCountry)}  
            </h2>
            <h2 className="round-text">Round {gameData.roundNumber}</h2>
          </div>
          
          {/* RIGHT STATS */}
          <div className="header-right">
            <div className="status">
              <span className={`turn-badge ${isMyTurn ? 'my-turn' : 'enemy-turn'}`}>
                {isMyTurn ? 'YOUR TURN' : `Waiting...`}
              </span>
              
                            <button 
                onClick={() => setIsFastForward(!isFastForward)}
                style={{
                  padding: '8px 15px', 
                  backgroundColor: isFastForward ? '#e74c3c' : '#bdc3c7',
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px', 
                  cursor: 'pointer',
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  opacity: isFastForward ? 1 : 0.6 // Dims the button when OFF
                }}
                title={isFastForward ? "Turn Fast-Forward OFF" : "Turn Fast-Forward ON"}
              >
               
                <img 
                  src="/fastforward.png" 
                  alt="Fast Forward" 
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    filter: isFastForward ? 'none' : 'grayscale(100%)' // Makes icon grey when off
                  }} 
                />
                {isFastForward ? 'ON' : 'OFF'}
              </button>

            </div>
            
            <div className="territory-progress">
              <div className="progress-text">
                <span>Territories: {countriesOwned} / {totalCountries}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ELIMINATION BANNER */}
        {isEliminated && (
          <div style={{ backgroundColor: '#c0392b', padding: '20px', borderRadius: '8px', marginBottom: '20px', color: 'white', textAlign: 'center' }}>
            <h2> YOU HAVE BEEN ELIMINATED </h2>
            <p>You have lost all your territories. Better luck next time, Commander.</p>
            <button onClick={() => setGameData(null)} className="quit-btn" style={{ marginTop: '10px' }}>
              Return to Menu
            </button>
          </div>
        )}

        

        {/* 3. ACTION PANEL */}
              <div className="action-panel">
          
          {/* Mode Toggle Buttons */}
          <div className="mode-toggle" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              onClick={() => { setActionMode('attack'); setSelectedAttacker(null); setSelectedDefender(null); }}
              style={{ padding: '10px 20px', backgroundColor: actionMode === 'attack' ? '#e67e22' : '#bdc3c7', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Attack Mode
            </button>
            <button 
              onClick={() => { setActionMode('transfer'); setSelectedAttacker(null); setSelectedDefender(null); }}
              style={{ padding: '10px 20px', backgroundColor: actionMode === 'transfer' ? '#3498db' : '#bdc3c7', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Transfer Mode
            </button>
          </div>

            <div className="selection-info">
            {actionMode === 'attack' ? (
              <>
                {selectedAttacker ? `Attacker: ${selectedAttacker}` : 'Select your green country'}
                {selectedDefender ? ` ➔ Target: ${selectedDefender}` : ''}
              </>
            ) : (
              <>
                {selectedAttacker ? `Source: ${selectedAttacker}` : 'Select source country'}
                {selectedDefender ? ` ➔ Destination: ${selectedDefender}` : ' (Select target country)'}
              </>
            )}
          </div>
          
          <div className="buttons">
            {actionMode === 'attack' ? (
              <button className="attack-btn" onClick={handleAttack} disabled={!isMyTurn || !selectedAttacker || !selectedDefender || isActionLoading || isEliminated}>
                {isActionLoading ? 'Rolling...' : 'Roll Dice (Attack)'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  min="1" 
                  value={transferAmount} 
                  onChange={(e) => setTransferAmount(e.target.value)}
                  style={{ width: '80px', padding: '10px', fontSize: '1.1rem', borderRadius: '5px', border: '1px solid #8b5a2b' }}
                />
                <button 
                  className="end-turn-btn" 
                  onClick={handleTransfer} 
                  disabled={!isMyTurn || !selectedAttacker || !selectedDefender || isActionLoading || isEliminated}
                  style={{ backgroundColor: '#3498db' }}
                >
                  {isActionLoading ? 'Transferring...' : ' Transfer Soldiers'}
                </button>
              </div>
            )}
            
            <button className="end-turn-btn" onClick={handleEndTurn} disabled={!isMyTurn || isActionLoading || isEliminated}>
              End Turn
            </button>

            <button className="quit-btn" onClick={() => setGameData(null)}>
              Quit
            </button>
          </div>
        </div>



        {/* AI COMMENTARY POPUP */}
        {showCommentary && (
          <div className="commentary-popup" onClick={() => setShowCommentary(null)}>
            <div className="speech-bubble">
              <div className="bubble-content">
                <span className="quote-mark">"</span>
                {showCommentary}
                <span className="quote-mark">"</span>
              </div>
              <button 
                className="close-bubble" 
                onClick={(e) => { e.stopPropagation(); setShowCommentary(null); }}
                title="Close"
              >
                ✖
              </button>
              {/* The triangle pointer for the speech bubble */}
              <div className="bubble-pointer"></div>
            </div>
          </div>
        )}

        {/* SUCCESS MESSAGE POPUP */}
        {successMessage && (
          <div className="success-popup" onClick={() => setSuccessMessage(null)}>
            <div className="success-toast">
              <span className="success-icon"></span>
              <p>{successMessage}</p>
            </div>
          </div>
        )}
        

        {/* 4. MAP */}
        <div className="map-container-wrapper">
          <GameMap 
            countries={gameData.countries}
            playerId="player_1"
            selectedAttacker={selectedAttacker}
            selectedDefender={selectedDefender}
            battleLog={battleLog}
            onCountryClick={(countryName) => {
              if (!isMyTurn || isEliminated) return;
              
              const countryData = gameData.countries.find(c => c.name === countryName);
              const isMyCountry = countryData.ownerId === 'player_1';

              if (actionMode === 'attack') {
                // ATTACK LOGIC
                if (isMyCountry) {
                  setSelectedAttacker(countryName);
                  setSelectedDefender(null); // Reset defender if attacker changes
                } else {
                  // Only set defender if we already have an attacker
                  if (selectedAttacker) setSelectedDefender(countryName);
                }
              } else if (actionMode === 'transfer') {
                // TRANSFER LOGIC
                if (!isMyCountry) {
                  // Optional: Block selection of enemy countries in transfer mode
                  return setSuccessMessage("You can only transfer to your own countries!"); 
                }

                if (!selectedAttacker) {
                  // If no source selected yet, this is the source
                  setSelectedAttacker(countryName);
                } else if (selectedAttacker === countryName) {
                  // If they click the same country again, deselect it
                  setSelectedAttacker(null);
                  setSelectedDefender(null);
                } else {
                  // Otherwise, this is the target
                  setSelectedDefender(countryName);
                }
              }
            }}
          />
        </div>

        {/* 5. BOTTOM BATTLE LOG */}
        {battleLog.length > 0 && (
          <div className="battle-log">
            <h1 style={{ textAlign: 'center', color: '#f10f0f' , fontWeight: 'bold'}}>  BATTLE LOG</h1>
            <h4> Latest Combat Results:</h4>
            {battleLog.slice(0, 3).map((log, index) => (
              <div key={index} className="log-entry">

                {/* AI Commentary Section */}
                <p style={{ 
                  fontStyle: 'italic', 
                  color: '#f39c12', 
                  fontSize: '1.1rem', 
                  textAlign: 'center', 
                  marginBottom: '15px' 
                }}>
                  "{log.aiCommentary}"
                </p>

                <h5 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#f10f0f' }}>
                  {log.isNpc ? log.npcName : 'You'} launched an attack!
                </h5>
                
                <div className="dice-container">
                  {/* Attacker Side */}
                  <div className="dice-side attacker-side">
                    <p className="dice-label">Attacker</p>
                    <div className="dice-row">
                      {log.attackerRolls.map((roll, i) => <Die key={i} value={roll} isAttacker={true} />)}
                    </div>
                    <p className="losses-text">-{log.attackerLosses} Soldiers</p>
                  </div>

                  <div className="vs-divider">VS</div>

                  {/* Defender Side */}
                  <div className="dice-side defender-side">
                    <p className="dice-label">Defender</p>
                    <div className="dice-row">
                      {log.defenderRolls.map((roll, i) => <Die key={i} value={roll} isAttacker={false} />)}
                    </div>
                    <p className="losses-text">-{log.defenderLosses} Soldiers</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


         {isMenuOpen && (
          <>
            <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000000', zIndex: 999 }} />
            <div style={{ position: 'fixed', top: 0, left: 0, width: '350px', height: '100vh', backgroundColor: '#ecf0f1', zIndex: 1000, padding: '20px', boxShadow: '5px 0 15px #000000', overflowY: 'auto', borderRight: '4px solid #000000', transition: 'transform 0.3s ease-in-out' }}>
              <button onClick={() => setIsMenuOpen(false)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#c0392b' }}>✖</button>
              <h2 style={{ color: '#3e2723', borderBottom: '2px solid #0b0b0b', paddingBottom: '10px' }}> War Analytics</h2>
              <div style={{ marginBottom: '20px', color: '#3e2723' }}>
                <p><b> Conquests:</b> {battlesWon}</p>
                <p><b> Soldiers Lost:</b> {soldiersLost}</p>
                <p><b> Territories Owned:</b> {myCountries.length} / {gameData.countries.length}</p>
              </div>
              <h3 style={{ color: '#3e2723', borderBottom: '2px solid #000000', paddingBottom: '10px' }}> Battle History</h3>
              <div>
                {gameData.history && gameData.history.length > 0 ? (
                  [...gameData.history].reverse().map((event, index) => {
                    const actor = gameData.players.find(p => p.playerId === event.actorId);
                    let eventText = "";
                    if (event.action === 'attack') eventText = `${actor?.name || 'Player'} attacked ${event.details.defender} from ${event.details.attacker}.`;
                    else if (event.action === 'transfer') eventText = `${actor?.name || 'Player'} transferred ${event.details.amount} soldiers to ${event.details.to}.`;
                    else if (event.action === 'reinforce') eventText = `${actor?.name || 'Player'} received reinforcements.`;

                    return (
                      <div key={index} style={{ borderBottom: '1px solid #d2b48c', padding: '8px 0', fontSize: '0.85rem', color: '#3e2723' }}>
                        <span style={{ fontWeight: 'bold', color: '#e67e22' }}>R{event.round}:</span> {eventText}
                      </div>
                    );
                  })
                ) : (<p style={{ color: '#3e2723' }}>No history yet.</p>)}
              </div>
            </div>
          </>
        )}


      </div>
    );


    
  }

    // LOGIN SCREEN 
  if (!isAuthenticated) {
    return (
      <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
       <img 
        src="/gameLogo.png" 
        alt="Geopolitics Game" 
        style={{ 
          width: '100%', 
          maxWidth: '600px', /* Adjust this to make it bigger or smaller */
          marginBottom: '20px',
          borderRadius: '12px' /* Optional: Adds rounded corners if your image has sharp edges */
        }} 
      />

       <p style={{ color: '#e74c3c', fontSize: '1.2rem', textAlign: 'center' }}>Conquer the world.</p>
        <h3>Secure Access Required</h3>
        
        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', marginTop: '20px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={accessCode} 
              onChange={(e) => setAccessCode(e.target.value)} 
              required 
              placeholder="Enter Access Code"
              style={{ padding: '12px', fontSize: '1.2rem', borderRadius: '8px', border: '2px solid #8b5a2b', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: '#5d4037'
              }}
            >
              {showPassword ? ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                /* Eye Open Icon (Visible) */
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>)}
            </button>
          </div>
          <button type="submit" style={{ padding: '12px', backgroundColor: '#3e2723', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Unlock War Room
          </button>
        </form>
      </div>
    );
  }

  // Otherwise, show the Start Screen
  return (
    <div className="App">
      <h1 style={{ color: '#e74c3c' }}>War Room Lobby</h1>
       <p>Select your commander and starting territory.</p>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleStartGame} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', margin: '0 auto', marginTop: '30px' }}>
        
                 {/* VISUAL AVATAR SELECTOR */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#e74c3c', display: 'block', marginBottom: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            Select Commander Avatar:
          </label>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { path: '/soldier.png', label: 'Soldier' },
              { path: '/soldier-3.png', label: 'Engineer' },
              { path: '/soldier-4.png', label: 'Sniper' },
              { path: '/soldier-5.png', label: 'Specialist' },
              { path: '/swat.png', label: 'SWAT' },
              { path: '/navy.png', label: 'Navy' }
            ].map((avatar) => (
              <img
                key={avatar.path}
                src={avatar.path}
                alt={avatar.label}
                onClick={() => setCommanderAvatar(avatar.path)}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  objectFit: 'cover',
                  border: commanderAvatar === avatar.path ? '4px solid #2ecc71' : '4px solid transparent',
                  transition: 'all 0.2s',
                  transform: commanderAvatar === avatar.path ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: commanderAvatar === avatar.path ? '0 0 15px rgba(46, 204, 113, 0.6)' : 'none'
                }}
              />
            ))}
          </div>
        </div>      
        
        <label>
          Commander Name:
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)} 
            required 
            placeholder="e.g. Celumusa"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </label>
        
        <label>
          Starting Country:
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="South Africa">South Africa</option>
            <option value="India">India</option>
            <option value="China">China</option>
            <option value="USA">USA</option>
            <option value="Brazil">Brazil</option>
            <option value="UK">UK</option>
          </select>
        </label>

        <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Starting...' : 'Enter War Room'}
        </button>

         {/* LOGOUT BUTTON */}
      <button 
        onClick={() => { setIsAuthenticated(false); setAccessCode(''); setError(''); }} 
        style={{ marginTop: '30px', background: 'none', border: 'none', color: '#7f8c8d', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Log Out / Lock System
      </button>


      </form>
    </div>
  );
}


export default App;