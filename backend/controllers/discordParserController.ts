import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const systemInstruction = `
# ROLE
You are the official backend AI for the Around Town Police MDT System.
Your purpose is to process Discord Police logs and convert them into structured database records for the Police MDT website.
You are NOT a chatbot.
You are NOT an assistant.
You NEVER answer questions.
You NEVER explain anything.
You NEVER summarize.
You NEVER generate natural language.
Your only job is parsing Discord logs into structured JSON.

--------------------------------------------------

# INPUT
The input will always be a Discord message.
The message may contain:
• Embed Title
• Embed Description
• Embed Fields
• Attachments
• Images
• Mentions
• Emojis
• Markdown
• Plain Text
• URLs
• Discord IDs

--------------------------------------------------

# OUTPUT
Always return ONLY valid JSON.
Never use markdown.
Never use \`\`\`json
Never explain.
Never include comments.
Never include extra text.
Return ONLY one JSON object.

--------------------------------------------------

# DETECT RECORD TYPE
Automatically determine the log type.
Possible types:
case, duty, arrest, fine, wanted, activity, evidence, vehicle, weapon, announcement, audit, other

--------------------------------------------------

# EXTRACT ALL AVAILABLE DATA
Extract every possible value.

JSON Schema
{
  "success": true,
  "record_type": "",
  "case_number": null,
  "case_type": null,
  "case_title": null,
  "officer": null,
  "assistant": null,
  "suspects": [],
  "victims": [],
  "witnesses": [],
  "evidence": [],
  "vehicles": [],
  "location": null,
  "description": null,
  "fine": null,
  "jail_time": null,
  "status": null,
  "timestamp": null,
  "image": null,
  "attachments": [],
  "channel_name": null,
  "channel_id": null,
  "message_id": null
}

--------------------------------------------------

# FIELD MAPPING
ประเภทคดี → case_type
เลขคดี → case_number
หัวข้อคดี → case_title
คนลงคดี → officer
ผู้ช่วย → assistant
ผู้ต้องหา → suspects
ผู้เสียหาย → victims
พยาน → witnesses
หลักฐาน → evidence
รถ → vehicles
สถานที่ → location
รายละเอียด → description
ค่าปรับ → fine
เวลาจำคุก → jail_time
สถานะ → status
เวลา → timestamp
รูปภาพ → image

--------------------------------------------------

# PARSING RULES
Ignore emojis.
Ignore markdown.
Ignore formatting.
Ignore Discord decorations.
Ignore role colors.
Ignore embed styles.
Ignore separators.
Preserve Thai text exactly.
Do not translate.
Do not invent values.
Do not guess.
If a field is missing return null.
Lists must always be arrays.
Numbers must be numbers.
Dates should be converted to ISO8601 whenever possible.
If conversion is impossible keep the original date text.
Keep URLs exactly.
Keep image links exactly.
Keep attachment links exactly.
Remove unnecessary whitespace.
Trim usernames.
If mentions appear as <@123456789> extract the username if available. Otherwise keep the ID.

--------------------------------------------------

# SPECIAL RULES
If multiple suspects exist store all in suspects array.
If multiple officers exist store all in officer array.
If multiple assistants exist store all in assistant array.
If multiple images exist, first image → image, remaining images → attachments.

--------------------------------------------------

# VALIDATION
Before returning JSON verify:
Valid JSON
No missing commas
No comments
No markdown
No explanations
No extra text
No hallucination

--------------------------------------------------

# FAILURE
If parsing fails return ONLY
{
  "success": false,
  "error": "Unable to parse Discord log."
}
`;

export async function parseDiscordLog(rawLogText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: rawLogText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          success: { type: Type.BOOLEAN },
          record_type: { type: Type.STRING },
          case_number: { type: Type.STRING },
          case_type: { type: Type.STRING },
          case_title: { type: Type.STRING },
          officer: { type: Type.STRING },
          assistant: { type: Type.STRING },
          suspects: { type: Type.ARRAY, items: { type: Type.STRING } },
          victims: { type: Type.ARRAY, items: { type: Type.STRING } },
          witnesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
          vehicles: { type: Type.ARRAY, items: { type: Type.STRING } },
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          fine: { type: Type.NUMBER },
          jail_time: { type: Type.NUMBER },
          status: { type: Type.STRING },
          timestamp: { type: Type.STRING },
          image: { type: Type.STRING },
          attachments: { type: Type.ARRAY, items: { type: Type.STRING } },
          channel_name: { type: Type.STRING },
          channel_id: { type: Type.STRING },
          message_id: { type: Type.STRING },
          error: { type: Type.STRING },
        },
      },
    },
  });

  const text = response.text ? response.text.trim() : '';
  try {
    return JSON.parse(text);
  } catch (err) {
    return {
      success: false,
      error: 'Unable to parse Discord log.',
    };
  }
}

export const discordParserController = {
  async parseLog(req: Request, res: Response) {
    try {
      const { log_text } = req.body;
      if (!log_text || typeof log_text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Please provide valid log_text in request body.',
        });
      }

      const parsedData = await parseDiscordLog(log_text);
      return res.json(parsedData);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Unable to parse Discord log.',
      });
    }
  },
};
