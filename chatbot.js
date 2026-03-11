document.addEventListener('DOMContentLoaded', () => {

        const form = document.getElementById('chat-form');
        const input = document.getElementById('user-input');
        const messages = document.getElementById('messages');
        const sendButton = form.querySelector("button");
        const newChatBtn = document.getElementById("new-chat");

        let thread_id = null;

        /* ------------------------------
           TEXTAREA AUTO EXPAND
        ------------------------------ */

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });

        /* ------------------------------
           ENTER TO SEND
        ------------------------------ */

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.requestSubmit();
            }
        });

        /* ------------------------------
           MARKDOWN FORMATTER
        ------------------------------ */

        const formatMarkdown = (text) => {
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^(\d+)\.\s+(.*)$/gm, '<p><strong>$1.</strong> $2</p>')
                .replace(/\n{2,}/g, '<br><br>')
                .replace(/\n/g, '<br>');
        };

        /* ------------------------------
           STRIP CITATIONS
        ------------------------------ */

        const stripCitations = (text) => {
            return text.replace(/【\d+:\d+†[^†【】]+(?:†[^【】]*)?】/g, '');
        };

        /* ------------------------------
           SCROLL TO BOTTOM
        ------------------------------ */
        function scrollToBottom() {
            const lastMessage = messages.lastElementChild;
            if (lastMessage) {
                lastMessage.scrollIntoView({ behavior: "smooth", block: "end" });
            }
        }


        /* ------------------------------
           CREATE MESSAGE BUBBLE
        ------------------------------ */

        const createBubble = (content, sender) => {

            const div = document.createElement('div');

            if (sender === 'bot') {

                const wrapper = document.createElement('div');
                wrapper.className = 'bot-message';

                const avatar = document.createElement('img');
                avatar.src = 'https://capable-brioche-99db20.netlify.app/Toby-Avatar.svg';
                avatar.className = 'avatar';

                div.className = 'bubble bot';
                div.innerHTML = content;

                /* Copy button */

                const copy = document.createElement("button");
                copy.className = "copy-btn";
                copy.innerText = "Copy";

                copy.onclick = () => {
                    navigator.clipboard.writeText(div.innerText);
                };



                div.appendChild(copy);

                wrapper.appendChild(avatar);
                wrapper.appendChild(div);

                messages.appendChild(wrapper);

            } else {

                div.className = 'bubble user';
                div.innerText = content;
                messages.appendChild(div);
                scrollToBottom();

            }

            scrollToBottom();
            return div;

        };

        /* ------------------------------
           TYPING INDICATOR
        ------------------------------ */

        const showTyping = () => {

            const typingHTML = `
                <div class="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
    `;

            return createBubble(typingHTML, 'bot');

        };

        /* ------------------------------
           STREAMING EFFECT
        ------------------------------ */

        const typeMessage = (text, bubble) => {

            let i = 0;

            const cleaned = stripCitations(text);
            const formatted = formatMarkdown(cleaned);

            const interval = setInterval(() => {

                bubble.innerHTML = formatted.substring(0, i);
                i++;

                scrollToBottom();

                if (i >= formatted.length) {
                    clearInterval(interval);
                }

            }, 8);

        };

        /* ------------------------------
           NEW CHAT
        ------------------------------ */

        if (newChatBtn) {

            newChatBtn.onclick = () => {

                thread_id = null;

                messages.innerHTML = "";

                createBubble(
                    "Hi! I'm Toby. Ask me anything about plumbing.",
                    "bot"
                );

            };

        }

        /* ------------------------------
           SUGGESTED QUESTIONS
        ------------------------------ */

        const suggestionButtons = document.querySelectorAll("#suggestions button");

        suggestionButtons.forEach(btn => {

            btn.onclick = () => {

                input.value = btn.innerText;
                form.requestSubmit();

            };

        });

        /* ------------------------------
           FORM SUBMIT
        ------------------------------ */

        form.addEventListener('submit', async (e) => {

            e.preventDefault();

            const message = input.value.trim();

            if (!message) return;

            createBubble(message, 'user');

            input.value = '';
            input.style.height = 'auto';

            sendButton.disabled = true;

            const typingBubble = showTyping();

            try {

                const startRes = await fetch(
                    'https://capable-brioche-99db20.netlify.app/.netlify/functions/start-run',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message, thread_id }),
                    }
                );

                const { thread_id: newThreadId, run_id } = await startRes.json();

                thread_id = newThreadId;

                let reply = '';
                let completed = false;

                while (!completed) {

                    const checkRes = await fetch(
                        'https://capable-brioche-99db20.netlify.app/.netlify/functions/check-run',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ thread_id, run_id }),
                        }
                    );

                    if (checkRes.status === 202) {

                        await new Promise(r => setTimeout(r, 1000));

                    } else if (checkRes.ok) {

                        const data = await checkRes.json();

                        reply = data.reply || '(No response)';

                        completed = true;

                    } else {

                        throw new Error('Check-run failed');

                    }

                }

                typingBubble.closest('.bot-message').remove();

                const botBubble = createBubble('', 'bot');

                typeMessage(reply, botBubble);

            } catch (err) {

                console.error(err);

                typingBubble.closest('.bot-message').remove();

                createBubble(
                    "🤖 My circuits got tangled for a second. Can we try that again?",
                    "bot"
                );

            }

            sendButton.disabled = false;

        });

    });
