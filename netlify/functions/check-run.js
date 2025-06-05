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
    const { thread_id, run_id } = JSON.parse(event.body || '{}');
    const apiKey = process.env.OPENAI_API_KEY;

    if (!thread_id || !run_id || !apiKey) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
        body: JSON.stringify({ error: 'Missing IDs or API key' }),
      };
    }

    // Check run status
    const runStatus = await fetch(
      `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    ).then((res) => res.json());

    if (runStatus.status !== 'completed') {
      return {
        statusCode: 202,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
        body: JSON.stringify({ status: runStatus.status }),
      };
    }

    // Get reply
    const messages = await fetch(
      `https://api.openai.com/v1/threads/${thread_id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    ).then((res) => res.json());

    const lastMessage = messages.data
      .filter((msg) => msg.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply: lastMessage?.content?.[0]?.text?.value || '(No reply)',
        thread_id,
      }),
    };
  } catch (error) {
    console.error('check-run error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
