import mammoth from 'mammoth'

// pdf-parse pulls in test fixtures at its package root if imported directly;
// importing the lib entry avoids that.
import pdf from 'pdf-parse/lib/pdf-parse.js'

const MAX_CHARS = 30_000 // keep token usage (and cost) bounded

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename = '',
): Promise<string> {
  const name = filename.toLowerCase()
  let text = ''

  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await pdf(buffer)
    text = data.text
  } else if (
    mimeType.includes('officedocument.wordprocessingml') ||
    mimeType.includes('msword') ||
    name.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer })
    text = value
  } else {
    throw new Error('Unsupported file type — please upload a PDF or DOCX.')
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim()
  if (!text) throw new Error('Could not read any text from that file.')
  return text.slice(0, MAX_CHARS)
}
