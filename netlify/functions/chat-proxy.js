const fetch = require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    const ASSISTANT_ID = 'asst_MnnHvPD6qJufOkfO8NyDjNv3'; // Replace with your actual Assistant ID

    // Step 1: Create a thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: openaiHeaders(),
    });

    const thread = await threadRes.json();

    // Step 2: Add user message to the thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: openaiHeaders(),
      body: JSON.stringify({
        role: 'user',
        content: message,
      }),
    });

    // Step 3: Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: openaiHeaders(),
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
      }),
    });

    const run = await runRes.json();

    // Step 4: Poll until run completes
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: openaiHeaders(),
      });
      runStatus = await statusRes.json();
    } while (runStatus.status !== 'completed');

    // Step 5: Get messages
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: openaiHeaders(),
    });

    const messagesData = await messagesRes.json();
    const assistantMessage = messagesData.data.find(msg => msg.role === 'assistant')?.content?.[0]?.text?.value;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ reply: assistantMessage || 'No reply.' }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function openaiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'assistants=v2'
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://masterplumbers.org.nz',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
