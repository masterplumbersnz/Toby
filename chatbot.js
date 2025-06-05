const messagesDiv = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');

let thread_id = null;

function appendMessage(text, sender) {
  const msg = document.createElement('div');
  msg.className = `bubble ${sender}`;
  msg.textContent = text;
  messagesDiv.appendChild(msg);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  appendMessage(message, 'user');
  input.value = '';
  appendMessage('Thinking...', 'bot');

  try {
    const startRes = await fetch('https://capable-brioche-99db20.netlify.app/.netlify/functions/start-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id }),
    });

    const { thread_id: returnedThreadId, run_id } = await startRes.json();
    thread_id = returnedThreadId;

    let reply = '(Waiting...)';
    let completed = false;

    while (!completed) {
      const checkRes = await fetch('https://capable-brioche-99db20.netlify.app/.netlify/functions/check-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id, run_id }),
      });

      if (checkRes.status === 202) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const result = await checkRes.json();
      reply = result.reply || '(No response)';
      completed = true;
    }

    const thinkingBubble = messagesDiv.querySelector('.bot:last-child');
    if (thinkingBubble) thinkingBubble.remove();

    appendMessage(reply, 'bot');

  } catch (err) {
    console.error('Chat error:', err);
    const thinkingBubble = messagesDiv.querySelector('.bot:last-child');
    if (thinkingBubble) thinkingBubble.remove();
    appendMessage('Sorry, something went wrong.', 'bot');
  }
});
