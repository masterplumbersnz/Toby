document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const messages = document.getElementById('messages');
  let thread_id = null;

  // Format markdown-style responses (bold, line breaks, numbered lists)
  const formatMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
      .replace(/^(\d+)\.\s+(.*)$/gm, '<p><strong>$1.</strong> $2</p>') // numbered list
      .replace(/\n{2,}/g, '<br><br>') // paragraph breaks
      .replace(/\n/g, '<br>'); // line breaks
  };

  // Convert OpenAI citation format to readable source labels
  const formatCitations = (text) => {
  // Replace valid OpenAI-style citations with a readable source label
    text = text.replace(/【\d+:\d+†(.*?)†.*?】/g, (_, rawSourceName) => {
      const safeSource = rawSourceName
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/[*_]/g, ""); // strip markdown characters
      return `<span class="citation">[Source: ${safeSource}]</span>`;
    });

  // Suppress malformed or leftover markers like 【4:19】, 【4:19], or [4:19]
    text = text.replace(/【\d+:\d+[^】]*】/g, ''); // removes full-width brackets
    text = text.replace(/\[\d+:\d+\]/g, '');      // removes square-bracketed forms

    return text;
  };

  const createBubble = (content, sender) => {
    const div = document.createElement('div');
    if (sender === 'bot') {
      const wrapper = document.createElement('div');
      wrapper.className = 'bot-message';

      const avatar = document.createElement('img');
      avatar.src = 'https://capable-brioche-99db20.netlify.app/toby-avatar.png';
      avatar.alt = 'Toby';
      avatar.className = 'avatar';

      div.className = 'bubble bot';
      div.innerHTML = formatCitations(formatMarkdown(content));

      wrapper.appendChild(avatar);
      wrapper.appendChild(div);
      messages.appendChild(wrapper);
    } else {
      div.className = 'bubble user';
      div.innerHTML = content;
      messages.appendChild(div);
    }

    messages.scrollTop = messages.scrollHeight;
    return div;
  };

  const showSpinner = () => {
    return createBubble('<span class="spinner"></span> Toby is thinking...', 'bot');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    createBubble(message, 'user');
    input.value = '';
    const thinkingBubble = showSpinner();

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
        } else if (checkRes.ok) {
          const data = await checkRes.json();
          reply = data.reply || '(No response)';
          completed = true;
        } else {
          throw new Error('Check-run failed with status: ' + checkRes.status);
        }
      }

      thinkingBubble.remove();
      createBubble(reply, 'bot');
    } catch (err) {
      console.error('Chat error:', err);
      thinkingBubble.remove();
      createBubble('⚠️ Something went wrong. Please try again later.', 'bot');
    }
  });
});
