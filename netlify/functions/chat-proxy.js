// chat-proxy.js - Netlify Function
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://masterplumbers.org.nz',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const { message, thread_id } = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing message in request body.' }),
      };
    }

    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    // Start a thread if no thread ID provided
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

    const threadId = threadRes.id;

    // Send user message to thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'user', content: message }),
    });

    // Run the assistant
    const run = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistant_id: assistantId }),
    }).then((res) => res.json());

    const runId = run.id;

    // Poll until complete
    let runStatus = 'in_progress';
    while (runStatus === 'in_progress' || runStatus === 'queued') {
      await new Promise((r) => setTimeout(r, 1500));
      const statusRes = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      ).then((res) => res.json());

      runStatus = statusRes.status;
    }

    // Get latest messages
    const messages = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    ).then((res) => res.json());

    const lastMessage = messages.data
      .filter((msg) => msg.role === 'assistant')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://masterplumbers.org.nz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply: lastMessage?.content?.[0]?.text?.value || '(No response)',
        thread_id: threadId,
      }),
    };
  } catch (error) {
    console.error('Chat Proxy Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://masterplumbers.org.nz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
