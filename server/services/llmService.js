const { GoogleGenAI } = require('@google/genai');

// Initialize with the  SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateBattleCommentary = async (battleDetails) => {
  const { attacker, defender, attackerRolls, defenderRolls, attackerLosses, defenderLosses, conquered } = battleDetails;

  const prompt = `
    You are a dramatic, epic war commentator for a game of Risk.
    Write a short, 2-sentence paragraph describing this battle.
    
    Attacker: ${attacker}
    Defender: ${defender}
    Attacker rolled: ${attackerRolls.join(', ')}
    Defender rolled: ${defenderRolls.join(', ')}
    Attacker lost ${attackerLosses} soldiers.
    Defender lost ${defenderLosses} soldiers.
    Did the attacker conquer the country? ${conquered ? 'YES' : 'NO'}.
    
    Make it sound like a historical war epic. Do not use generic text, use the specific numbers and country names provided.
  `;

  try {
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.log("AI generation failed, using fallback:", error.message);
    return `The forces of ${attacker} clashed with ${defender}. Losses were heavy on both sides.`; 
  }
};

module.exports = { generateBattleCommentary };