const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(400).json({ 
        error: 'Gemini API Key is not configured. Please add it to the .env file.',
        missing_key: true
      });
    }

    const { prompt, channel, image, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // System instruction to guide the AI on formatting and placeholders
    const systemPrompt = `You are an expert real estate communication assistant in Dubai. 
The user will ask you to write a message for a ${channel || 'communication'} campaign.
Your job is to generate a professional, engaging, and clear draft.
IMPORTANT RULES:
1. The message will be sent in bulk. You MUST use EXACTLY these placeholders for personalization if you want to address the person:
   - {{name}} for the person's name
   - {{phone}} for their phone number
   - {{email}} for their email address
2. Do not use [Name] or [Tenant Name]. Use {{name}}.
3. Keep the tone professional but approachable.
4. Do not include subject lines unless it's an email. If it is an email, put "Subject: ..." on the first line.
5. Provide ONLY the final message text, no conversational filler like "Here is the draft:".`;

    let fullPrompt = `${systemPrompt}\n\n`;
    if (history && history.length > 0) {
      fullPrompt += "Previous Conversation Context (for memory):\n";
      history.forEach((msg, i) => {
        fullPrompt += `User: ${msg.prompt}\nAI: ${msg.response}\n\n`;
      });
      fullPrompt += "---\n\n";
    }
    fullPrompt += `Current User Request: ${prompt}`;

    const promptParts = [fullPrompt];
    if (image && image.data && image.mimeType) {
      promptParts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }

    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const text = response.text();

    if (text) {
      res.json({ success: true, text: text });
    } else {
      res.status(500).json({ error: 'AI returned an empty response' });
    }

  } catch (err) {
    console.error('AI Generation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate message' });
  }
});

module.exports = router;
