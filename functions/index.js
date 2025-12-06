const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Stable voices prioritized for the best pronunciation
const STABLE_GEMINI_VOICES = {
  default: "Kore",
  "en-US": "Zephyr",
  "es-ES": "Kore",
  "fr-FR": "Kore",
  "de-DE": "Kore",
  "ja-JP": "Kore",
  "ko-KR": "Kore",
  "zh-CN": "Leda",
  "ru-RU": "Orus",
  "it-IT": "Autonoe",
  "pt-BR": "Enceladus",
  "hi-IN": "Iapetus",
};

exports.geminiProxy = onRequest(
  { secrets: ["GEMINI_API_KEY"], region: "us-central1" },
  async (req, res) => {
    // --- CORS ---
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing API key" });

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

      const TEXT_MODEL = "gemini-2.5-flash";
      // ✅ FIX: Must use the specific TTS preview model for audio generation
      const TTS_MODEL = "gemini-2.5-flash-preview-tts"; 

      switch (action) {
        // ---------------------------
        // TRANSLATE
        // ---------------------------
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

          const translated = modelResult.response.text().trim();
          return res.status(200).json({ translatedText: translated });
        }

        // ---------------------------
        // EXPLAIN
        // ---------------------------
        case "explain": {
          const model = genAI.getGenerativeModel({ model: TEXT_MODEL });

          modelResult = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Define "${text}" in English. Format: [Part of Speech] Definition. Max 20 words. No asterisks.`,
                  },
                ],
              },
            ],
          });

          const definition = modelResult.response.text().trim();
          return res.status(200).json({ definition });
        }

        // ---------------------------
        // GRAMMAR CHECK
        // ---------------------------
        case "checkGrammar": {
          const model = genAI.getGenerativeModel({
            model: TEXT_MODEL,
            config: { responseMimeType: "application/json" },
          });

          const grammarPrompt = `Analyze the following text in ${lang}. If there is an error, return ONLY JSON: { "hasError": true, "correction": "corrected text", "reason": "brief explanation" }. If the grammar is correct, return ONLY JSON: { "hasError": false }. Text: "${text}"`;

          modelResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: grammarPrompt }] }],
          });

          const raw = modelResult.response.text().trim();

          try {
            let jsonMatch = raw.match(/\{[\s\S]*\}/);
            let parsed;

            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            else parsed = JSON.parse(raw);

            return res.status(200).json(parsed);
          } catch {
            return res.status(200).json({
              hasError: false,
              error: "AI returned malformed JSON, assumed correct.",
            });
          }
        }

        // ---------------------------
        // CHAT RESPONSE
        // ---------------------------
        case "generateAIResponse": {
          const model = genAI.getGenerativeModel({
            model: TEXT_MODEL,
            config: { responseMimeType: "application/json" },
          });

          const chatPrompt = `RETURN ONLY JSON. Respond in English, then translate to ${lang}. Use context: ${context}. Chat as Poly, a friendly tutor, with ${userName}. User said: "${userText}". JSON format: { "english": "...", "target": "..." }`;

          modelResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: chatPrompt }] }],
          });

          const raw = modelResult.response.text().trim();

          try {
            let jsonMatch = raw.match(/\{[\s\S]*\}/);
            let parsed;

            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            else parsed = JSON.parse(raw);

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

        // ---------------------------
        // TTS (AUDIO)
        // ---------------------------
        case "playGeminiTTS": {
          const voiceName =
            STABLE_GEMINI_VOICES[langCode] ||
            STABLE_GEMINI_VOICES.default;

          const ttsPrompt = `Speak this text with a clear ${langCode} accent and a friendly tone: "${text}"`;

          const model = genAI.getGenerativeModel({
            model: TTS_MODEL,
          });

          const response = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: ttsPrompt }],
              },
            ],
            // Use 'generationConfig' for TTS parameters when calling generateContent
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });

          // Extract audio (using robust candidate and part finding)
          const part = response.response.candidates?.[0]?.content?.parts.find(
            (p) => p.inlineData
          );

          if (!part || !part.inlineData?.data) {
            return res
              .status(500)
              .json({ error: "No audio data returned by model." });
          }

          return res.status(200).json({ inlineData: part.inlineData });
        }

        default:
          return res.status(400).json({ error: "Invalid action" });
      }
    } catch (err) {
      console.error("Function Error:", err);
      // Ensure the error message from the SDK is returned
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
  }
);