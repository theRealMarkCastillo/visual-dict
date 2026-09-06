import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    // Strip accidental surrounding quotes or whitespace
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  }
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured or is empty. Please set a valid Gemini API key in your .env file: GEMINI_API_KEY=AIzaSy... (or run `export GEMINI_API_KEY="AIzaSy..."` in your terminal).'
    );
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

function formatGeminiError(action: string, error: any) {
  console.error(`${action} error:`, error);
  const errMsg = error?.message || String(error);
  if (errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || error?.status === 403) {
    console.error(`\n⚠️  GEMINI AUTHENTICATION FAILED:
The request was rejected because the Google Gen AI SDK attempted to authenticate using Google Cloud ADC credentials (gcloud) with insufficient scopes instead of a Gemini API key.
To resolve:
1. Ensure your .env file in the project root contains:
   GEMINI_API_KEY=AIzaSy...
2. Get your Gemini API key at: https://aistudio.google.com/app/apikey
3. Or export it directly in your terminal before running npm run dev:
   export GEMINI_API_KEY="AIzaSy..."\n`);
    return 'Google Gemini API authentication failed. Please check that GEMINI_API_KEY is configured with an AI Studio API key in your .env file or exported in your terminal.';
  }
  return errMsg || `Failed to ${action.toLowerCase()}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('Generating image and explanation for prompt:', prompt);
      const ai = getAIClient();
      const [imageResponse, textResponse] = await Promise.all([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                text: prompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
            }
          }
        }),
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: {
            parts: [
              {
                text: `Provide a short, 2 to 3 line definition or brief explanation of "${prompt}". Return only the text without any markup.`,
              },
            ],
          },
        })
      ]);

      let imageUrl = null;
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          // It's usually safe to assume it will be an image types depending on response, image/png or jpeg
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          break; // Stop at first image
        }
      }

      if (imageUrl) {
        res.json({ imageUrl, explanation: textResponse.text });
      } else {
        res.status(500).json({ error: 'No image found in response' });
      }
    } catch (error: any) {
      const formattedError = formatGeminiError('Image generation', error);
      res.status(500).json({ error: formattedError });
    }
  });

  app.post('/api/generate-content', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      console.log('Generating content for:', query);
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              text: `Write a detailed article about "${query}". Return the response as a JSON object with two fields: "title" (a suitable title) and "paragraphs" (an array of strings, where each string is a paragraph of the article, at least 5 paragraphs). Do not include any markdown formatting outside the JSON object.`,
            },
          ],
        },
        config: {
            responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        try {
          const parsed = JSON.parse(text);
          res.json(parsed);
        } catch (e) {
             res.status(500).json({ error: 'Failed to parse JSON response' });
        }
      } else {
        res.status(500).json({ error: 'No text content found' });
      }
    } catch (error: any) {
      const formattedError = formatGeminiError('Content generation', error);
      res.status(500).json({ error: formattedError });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
