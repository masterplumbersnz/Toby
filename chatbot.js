document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const messages = document.getElementById('messages');
  let thread_id = null;

  const appendMessage = (text, sender) => {
    const div = document.createElement('div');
    div.className = `bubble ${sender}`;
    div.textContent = text;
    messages.appendChild(div);
  };

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
      const { thread_id: newThreadId, run_id } = await startRes.json();
      thread_id = newThreadId;

      let reply = '';
      let completed = false;

      while (!completed) {
        const checkRes = await fetch('https://capable-brioche-99db20.netlify.app/.netlify/functions/check-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id, run_id }),
        });

        if (checkRes.status === 202) {
          await new Promise(r => setTimeout(r, 1000));
        } else {
          const data = await checkRes.json();
          reply = data.reply || '(No response)';
          completed = true;
        }
      }

      const thinking = messages.querySelector('.bot:last-child');
      if (thinking) thinking.remove();
      appendMessage(reply, 'bot');
    } catch (err) {
      console.error('Chat error:', err);
      appendMessage('Something went wrong. Try again later.', 'bot');
    }
  });
});
