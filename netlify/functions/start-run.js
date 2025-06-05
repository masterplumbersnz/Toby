const fetch = require('node-fetch');

const ALLOWED_ORIGIN = 'https://masterplumbers.org.nz';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const { message, thread_id } = JSON.parse(event.body || '{}');
    const apiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!message || !apiKey || !assistantId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
        body: JSON.stringify({ error: 'Missing data or env vars.' }),
      };
    }

    const threadRes = thread_id
      ? { id: thread_id }
      : await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
            'Content-Type': 'application/json',
          },
        }).then((res) => res.json());

    await fetch(`https://api.openai.com/v1/threads/${threadRes.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'user', content: message }),
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadRes.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistant_id: assistantId }),
    }).then((res) => res.json());

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ thread_id: threadRes.id, run_id: runRes.id }),
    };
  } catch (error) {
    console.error('start-run error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
