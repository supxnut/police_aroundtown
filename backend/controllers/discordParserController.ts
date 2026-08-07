import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const systemInstruction = `
# ROLE
You are the official backend AI for the Around Town Police MDT System.
Your purpose is to process Discord Police logs and convert them into structured database records for the Police MDT website.
You are NOT a chatbot. You are NOT an assistant. You NEVER answer questions. You NEVER explain anything. You NEVER summarize. You NEVER generate natural language.
Your only job is parsing Discord logs into structured JSON.

--------------------------------------------------

# CRITICAL OUTPUT REQUIREMENTS
• "success" MUST always exist (boolean).
• "record_type" MUST always exist.
• Allowed record_type values ONLY (lowercase):
  - "case"
  - "duty"
  - "activity"
  - "evidence"
  - "wanted"
  - "audit"
  - "other"

Never return "Case", "CASE", "cases", "Case Record", "Duty Log", etc. ALWAYS use lowercase.
If the title or text contains "บันทึกคดี", record_type MUST be "case".

--------------------------------------------------

# DESCRIPTION LINE-BY-LINE PARSING
Discord Police Log formats often put everything into Embed Description as plain text instead of Embed Fields.
Extract information line-by-line using these label markers:
• "ประเภทคดี" → case_type
• "คนลงคดี" → officer
• "ผู้ช่วย" → assistant (can be array or string of names/mentions)
• "เวลา" → timestamp
• "รูปภาพ" → image

Everything after each label marker up to the next label marker belongs to that field.

--------------------------------------------------

# DATABASE COMPATIBILITY
Always include these exact fields in every JSON output even if null:
• success (boolean)
• record_type (string, lowercase)
• case_number (string or null)
• case_type (string or null)
• case_title (string or null)
• officer (string or null)
• assistant (string or null)
• suspects (array of strings)
• description (string or null)
• status (string or null)
• timestamp (string or null)
• image (string or null)

Never omit fields. Never rename fields. Never create new field names.

--------------------------------------------------

# PARSING RULES
Ignore emojis, markdown, formatting, Discord decorations, role colors, embed styles, separators.
Preserve Thai text exactly. Do not translate. Do not invent values or guess.
If a field is missing return null (or [] for arrays).
Dates should be converted to ISO8601 whenever possible. Keep URLs/images exactly.
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
          record_type: {
            type: Type.STRING,
            enum: ['case', 'duty', 'activity', 'evidence', 'wanted', 'audit', 'other'],
          },
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
        required: [
          'success',
          'record_type',
          'case_number',
          'case_type',
          'case_title',
          'officer',
          'assistant',
          'suspects',
          'description',
          'status',
          'timestamp',
          'image',
        ],
      },
    },
  });

  const text = response.text ? response.text.trim() : '';
  try {
    const parsed = JSON.parse(text);
    // Normalize record_type strictly to lowercase allowed values
    if (parsed && typeof parsed === 'object') {
      parsed.success = typeof parsed.success === 'boolean' ? parsed.success : true;
      let rt = String(parsed.record_type || 'other').toLowerCase().trim();
      if (rawLogText.includes('บันทึกคดี')) {
        rt = 'case';
      } else if (!['case', 'duty', 'activity', 'evidence', 'wanted', 'audit', 'other'].includes(rt)) {
        if (rt.includes('case')) rt = 'case';
        else if (rt.includes('duty')) rt = 'duty';
        else if (rt.includes('activity')) rt = 'activity';
        else if (rt.includes('evidence')) rt = 'evidence';
        else if (rt.includes('wanted')) rt = 'wanted';
        else if (rt.includes('audit')) rt = 'audit';
        else rt = 'other';
      }
      parsed.record_type = rt;

      // Ensure mandatory fields exist
      const mandatoryKeys = [
        'case_number',
        'case_type',
        'case_title',
        'officer',
        'assistant',
        'description',
        'status',
        'timestamp',
        'image',
      ];
      for (const key of mandatoryKeys) {
        if (parsed[key] === undefined) {
          parsed[key] = null;
        }
      }
      if (!Array.isArray(parsed.suspects)) {
        parsed.suspects = [];
      }
    }
    return parsed;
  } catch (err) {
    return {
      success: false,
      record_type: 'other',
      case_number: null,
      case_type: null,
      case_title: null,
      officer: null,
      assistant: null,
      suspects: [],
      description: null,
      status: null,
      timestamp: null,
      image: null,
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
          record_type: 'other',
          case_number: null,
          case_type: null,
          case_title: null,
          officer: null,
          assistant: null,
          suspects: [],
          description: null,
          status: null,
          timestamp: null,
          image: null,
          error: 'Please provide valid log_text in request body.',
        });
      }

      const parsedData = await parseDiscordLog(log_text);
      return res.json(parsedData);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        record_type: 'other',
        case_number: null,
        case_type: null,
        case_title: null,
        officer: null,
        assistant: null,
        suspects: [],
        description: null,
        status: null,
        timestamp: null,
        image: null,
        error: error.message || 'Unable to parse Discord log.',
      });
    }
  },
};
