const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.geminiProxy = onRequest(
  { secrets: ["GEMINI_API_KEY"], region: "us-central1" },
  async (req, res) => {
    // --- CORS SETUP ---
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API key" });

    // Initialize the main client
    const genAI = new GoogleGenerativeAI(apiKey);

    const {
      action,
      text,
      targetLang,
      lang,
      userText,
      userName,
      context,
      langCode,
    } = req.body;

    try {
      let modelResult;

      // --- MODEL ALIASES ---
      const TEXT_MODEL = "gemini-2.5-flash"; 
      const TTS_MODEL = "gemini-2.5-flash-preview-tts"; 

      switch (action) {
        // TRANSLATE
        case "translate": {
          const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
          
          modelResult = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Translate to ${targetLang}. Output ONLY the translated text: "${text}"`,
                  },
                ],
              },
            ],
          });

          const translated = modelResult.response.text().trim() || "";
          return res.status(200).json({ translatedText: translated });
        }

        // EXPLAIN
        case "explain": {
          const model = genAI.getGenerativeModel({ model: TEXT_MODEL });

          modelResult = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Define "${text}" in English. Format: [Part of Speech] Definition. Max 20 words. No asterisks`,
                  },
                ],
              },
            ],
          });

          const definition = modelResult.response.text().trim() || "";
          return res.status(200).json({ definition });
        }

        // GRAMMAR CHECK
        case "checkGrammar": {
          const model = genAI.getGenerativeModel({ 
            model: TEXT_MODEL,
            config: { responseMimeType: "application/json" }
          });
          
          // Improved grammar prompt for clearer JSON output
          const grammarPrompt = `Analyze the following text in ${lang}. If there is an error, return ONLY JSON: { "hasError": true, "correction": "corrected text", "reason": "brief explanation" }. If the grammar is correct, return ONLY JSON: { "hasError": false }. Text: "${text}"`;

          modelResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: grammarPrompt }] }],
          });

          const raw = modelResult.response.text().trim();
          
          try {
            // Check if the model outputted a code block and extract the JSON
            let jsonMatch = raw.match(/\{[\s\S]*\}/);
            let parsed;
            
            if (jsonMatch && jsonMatch.length > 0) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = JSON.parse(raw);
            }
            return res.status(200).json(parsed);
          } catch {
            // Fallback for malformed JSON
            return res.status(200).json({ hasError: false, error: "AI returned malformed JSON, assumed correct." });
          }
        }

        // AI RESPONSE (Chat)
        case "generateAIResponse": {
          const model = genAI.getGenerativeModel({ 
            model: TEXT_MODEL,
            config: { responseMimeType: "application/json" }
          });
          
          // Simplified prompt with strong JSON enforcement
          const chatPrompt = `RETURN ONLY JSON. Respond in English, then translate to ${lang}. Use context: ${context}. Chat as Poly, a friendly tutor, with ${userName}. User said: "${userText}". The required JSON format is: { "english": "...", "target": "..." }`;

          modelResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: chatPrompt }] }],
          });

          const raw = modelResult.response.text().trim();
          
          try {
            // Robust JSON parsing with regex fallback
            let jsonMatch = raw.match(/\{[\s\S]*\}/);
            let parsed;
            
            if (jsonMatch && jsonMatch.length > 0) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = JSON.parse(raw);
            }
            return res.status(200).json({ response: parsed });
          } catch {
            return res.status(500).json({
              error: "AI failed to generate valid JSON.",
              response: {
                english: "I'm sorry, I had a processing error. Can you try again?",
                target: "Lo siento, tuve un error de procesamiento. ¿Puedes intentar de nuevo?",
              },
            });
          }
        }

        // TTS (AUDIO GENERATION)
        case "playGeminiTTS": {
          const model = genAI.getGenerativeModel({
            model: TTS_MODEL,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
              },
            },
          });
          
          modelResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text }] }],
          });

          // Extract the base64 audio data
          const inlineData = modelResult.response.candidates
            ?.[0]?.content?.parts?.[0]?.inlineData;
            
          if (!inlineData) return res.status(500).json({ error: "No audio data returned by model." });

          return res.status(200).json({ inlineData });
        }

        default:
          return res.status(400).json({ error: "Invalid action" });
      }
    } catch (err) {
      console.error("Function Error:", err);
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
  }
);