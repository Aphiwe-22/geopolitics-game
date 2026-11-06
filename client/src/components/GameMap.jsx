import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker} from "react-simple-maps";



const ShipIcon = () => (
  <g transform="scale(0.5)">
    {/* Hull */}
    <path 
      d="M 0 20 Q 15 35 30 20 L 25 10 L 5 10 Z" 
      fill="#8b5a2b" 
      stroke="#3e2723" 
      strokeWidth="2" 
    />
    {/* Mast */}
    <rect x="14" y="-15" width="2" height="25" fill="#3e2723" />
    {/* Sails */}
    <path 
      d="M 16 -10 Q 30 0 16 10 Z" 
      fill="#f4ecd8" 
      stroke="#3e2723" 
      strokeWidth="1" 
    
    />
    <path 
      d="M 14 -5 Q 0 5 14 15 Z" 
      fill="#f4ecd8" 
      stroke="#3e2723" 
      strokeWidth="1" 
    />
    {/* Flag */}
    <path d="M 16 -15 L 25 -15 L 16 -10 Z" fill="#e74c3c" />
  </g>
);

// A highly stable public TopoJSON file
const geoUrl = "/countries-110m.json";
  const getCoordinates = (name) => {
    const coords = {
      "USA": [-98, 39], "Brazil": [-51, -14], "UK": [-3, 54], 
      "Vatican City": [12, 41], "Nigeria": [8, 9], "South Africa": [22, -30],
      "Russia": [105, 61], "China": [104, 35], "India": [78, 20], "Pakistan": [69, 30],
      "Bangladesh": [90, 23], "Indonesia": [113, -0.7], "Mexico": [-102, 23]
    };
    return coords[name] || [0, 0];
  };

const GameMap = ({ countries, onCountryClick, selectedAttacker, selectedDefender, playerId, battleLog }) => {
  const [hovered, setHovered] = useState(null);

  const [explosionTarget, setExplosionTarget] = useState(null);

  useEffect(() => {
    if (battleLog && battleLog.length > 0) {
      const latestBattle = battleLog[0];
      // If the latest battle resulted in a conquest, trigger the explosion
      if (latestBattle.conquered) {
        setExplosionTarget(latestBattle.defenderCountry); 
        
        // Clear the explosion after 1 second
        const timer = setTimeout(() => setExplosionTarget(null), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [battleLog]);


  const getCountryData = (mapName) => {
    const nameMapping = {
      "United States of America": "USA",
      "United Kingdom": "UK",
      "Russian Federation": "Russia",
      "Republic of India": "India",
      "People's Republic of China": "China",
      "Republic of Indonesia": "Indonesia",
      "Islamic Republic of Pakistan": "Pakistan",
      "Federal Republic of Nigeria": "Nigeria",
      "Federative Republic of Brazil": "Brazil",
      "People's Republic of Bangladesh": "Bangladesh",
      "United Mexican States": "Mexico",
      "Republic of South Africa": "South Africa",
      "French Republic": "France"

    };
    const backendName = nameMapping[mapName] || mapName;
    return countries.find(c => c.name === backendName);
  };

     const getFillColor = (countryData) => {
    if (!countryData) return "#e0e0e0"; // Light grey for un-playable (though we hide them)
    
    if (selectedAttacker === countryData.name) return "#f1c40f"; // Yellow
    if (selectedDefender === countryData.name) return "#9b59b6"; // Purple
    if (countryData.ownerId === playerId) return "#2ecc71"; // Bright Green (Player)
    
    // Bright NPC Colors
    const npcColors = ['#e74c3c', '#3498db', '#e67e22', '#1abc9c', '#d35400', '#8e44ad', '#c0392b', '#16a085', '#f39c12'];
    
    if (countryData.ownerId) {
      const index = parseInt(countryData.ownerId.replace('npc_', '')) || 0;
      return npcColors[index % npcColors.length];
    }
    return "#e74c3c"; 
  };

// Helper to draw the curved line using the map's projection
  const renderAttackLine = (projection) => {
    if (!selectedAttacker || !selectedDefender) return null;
    
    const start = getCoordinates(selectedAttacker);
    const end = getCoordinates(selectedDefender);
    if (!start || !end) return null;

    const startPoint = projection(start);
    const endPoint = projection(end);
    if (!startPoint || !endPoint) return null;

    const midX = (startPoint[0] + endPoint[0]) / 2;
    const midY = (startPoint[1] + endPoint[1]) / 2 - 40; 

    return (
      <g>
        {/* The Glowing, Pulsing Dashed Line */}
        <path
          d={`M ${startPoint[0]},${startPoint[1]} Q ${midX},${midY} ${endPoint[0]},${endPoint[1]}`}
          fill="transparent"
          stroke="#f1c40f"
          strokeWidth="3"
          strokeDasharray="10,6"
          markerEnd="url(#arrowhead)"
          className="attack-line-animation"
        />
        
        {/* The Pulsing Target Spark */}
        <circle
          cx={endPoint[0]}
          cy={endPoint[1]}
          r="8"
          fill="#e74c3c"
          className="target-spark"
        />
      </g>
    );
  };



 

  return (
    <div style={{ 
      backgroundColor: '#1a252f', 
      borderRadius: '12px', 
      overflow: 'hidden', 
      marginBottom: '20px', 
      border: '4px solid #34495e',
      height: '650px', // Added fixed height
      position: 'relative'
    }}>


        <ComposableMap 
        projection="geoEqualEarth"
        projectionConfig={{ scale: 200 }} 
        style={{ width: "100%", height: "100%" }}
      >

        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f1c40f" />
          </marker>
        </defs>

              <Geographies geography={geoUrl}>
          {({ geographies, projection }) => (
            <> 
              {/* */}
              {geographies.map((geo) => {
                const countryData = getCountryData(geo.properties.name);
                
                if (!countryData) return null; 

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(countryData)}
                    onClick={() => onCountryClick(countryData.name)}
                    onMouseEnter={() => setHovered(countryData.name)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      default: {
                        fill: getFillColor(countryData),
                        stroke: "#fff",
                        strokeWidth: 1,
                        outline: "none",
                        transition: "all 250ms"
                      },
                      hover: {
                        fill: "#f1c40f", 
                        stroke: "#fff",
                        strokeWidth: 2,
                        outline: "none",
                        cursor: "pointer"
                      },
                      pressed: {
                        fill: "#e67e22",
                        outline: "none"
                      }
                    }}
                  />
                );
              })}

              {/* RENDER THE LINE HERE */}
              {renderAttackLine(projection)}

            {/* EXPLOSION EFFECT */}
              {explosionTarget && (
                <Marker coordinates={getCoordinates(explosionTarget)}>
                  <circle 
                    cx="0" 
                    cy="0" 
                    r="15" 
                    fill="none" 
                    stroke="#f1c40f" 
                    strokeWidth="4" 
                    className="explosion-ring"
                  />
                  <circle 
                    cx="0" 
                    cy="0" 
                    r="15" 
                    fill="#e74c3c" 
                    opacity="0.4" 
                    className="explosion-core"
                  />
                </Marker>
              )}

            </>
          )}
        </Geographies>


         {/*Text Labels and soldier count on top of the countries */}
        {countries.map((country) => {
          // Use the top-level getCoordinates function instead of redefining it!
          return (
            <Marker key={country.name} coordinates={getCoordinates(country.name)}>
              <rect x="-20" y="-10" width="40" height="20" rx="5" fill="rgba(0,0,0,0.6)" />
              <text
                textAnchor="middle"
                y={-2}
                style={{ fontFamily: "sans-serif", fill: "#fff", fontSize: "10px", fontWeight: "bold" }}
              >
                {country.name}
              </text>
              <text
                y={8}
                textAnchor="middle"
                style={{ fontFamily: "sans-serif", fill: "#f1c40f", fontSize: "10px", fontWeight: "bold" }}
              >
                ⚔️ {country.soldiers}
              </text>
            </Marker>
          );
        })}

              {/* --- DECORATIVE MARKERS (Ships and Wheels) --- */}

        {/* SHIPS */}
        {/* 1. Atlantic Ocean (Between USA and Europe) */}
        <Marker coordinates={[-40, 20]}>
          <image 
            xlinkHref={`${window.location.origin}/whiteship.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none' }} 
          />
        </Marker>

        {/* 2. Pacific Ocean (West of South America) */}
        <Marker coordinates={[-120, -20]}>
          <image 
            xlinkHref={`${window.location.origin}/whiteship.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none', transform: 'scaleX(-1)' }} // Flips the ship to face East
          />
        </Marker>

        {/* 3. Indian Ocean (East of Africa) */}
        <Marker coordinates={[70, -20]}>
          <image 
            xlinkHref={`${window.location.origin}/whiteship.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none' }} 
          />
        </Marker>

        {/* 4. South Pacific (Off the coast of Australia) */}
        <Marker coordinates={[160, -40]}>
          <image 
            xlinkHref={`${window.location.origin}/whiteship.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none', transform: 'scaleX(-1)' }} 
          />
        </Marker>

        {/* WHEELS */}
        {/* 1. North Atlantic */}
        <Marker coordinates={[-180, 35]}>
          <image 
            xlinkHref={`${window.location.origin}/wheel.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none' }} 
          />
        </Marker>

        {/* 2. South Atlantic */}
        <Marker coordinates={[-20, -40]}>
          <image 
            xlinkHref={`${window.location.origin}/wheel.png`} 
            x="-20" y="-20" width="40" height="40" 
            style={{ pointerEvents: 'none' }} 
          />
        </Marker>


      </ComposableMap>

      {/* Tooltip for hovered country */}
      {hovered && (
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.8)', 
          padding: '10px 20px', 
          borderRadius: '8px',
          color: '#ecf0f1',
          pointerEvents: 'none'
        }}>
          {hovered} 
          {getCountryData(hovered) ? ` — Soldiers: ${getCountryData(hovered).soldiers}` : ' (Not in game)'}
        </div>
      )}
    </div>
  );
};

export default GameMap;