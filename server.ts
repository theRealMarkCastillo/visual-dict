import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('Generating image and explanation for prompt:', prompt);
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
      console.error('Image generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate image' });
    }
  });

  app.post('/api/generate-content', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      console.log('Generating content for:', query);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
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
      console.error('Content generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate content' });
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
