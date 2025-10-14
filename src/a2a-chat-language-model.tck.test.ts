import { convertReadableStreamToArray } from 'ai/test';
import { createA2a } from './a2a-provider';
import { describe, it, expect } from 'vitest';

const provider = createA2a({});


const AGENT_URL = 'http://0.0.0.0:9999/.well-known/agent-card.json'

describe('tck test', () => {

 it('tck echo doGenerate', async () => {

    const model = provider(AGENT_URL, {
      "a2a": {
        "contextId": crypto.randomUUID(),
      }
    });

    const { content } = await model.doGenerate({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: "Tell me a fact about chuck norris." }] }
      ],
    });

    const jokeText = `Hello World! You said: 'Tell me a fact about chuck norris.'. Thanks for your message!`;

    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe(jokeText);
  }, 60000);


   it('tck echo doStream', async () => {
    
    const model = provider(AGENT_URL, {
      "a2a": {
        "contextId": crypto.randomUUID(),
      }
    });
    const {stream} = await model.doStream({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: "Tell me a fact about chuck norris." }] }
      ],
    });

    const array = await convertReadableStreamToArray(stream);

    const taskId = array[1].id;
    const artifactId = array[2].id;
    const echoText = `Hello World! You said: 'Tell me a fact about chuck norris.'. Thanks for your message!`;

    expect(array).toMatchInlineSnapshot(`
      [
        {
          "type": "stream-start",
          "warnings": [],
        },
        {
          "id": "${taskId}",
          "modelId": undefined,
          "timestamp": undefined,
          "type": "response-metadata",
        },
        {
          "id": "${artifactId}",
          "type": "text-start",
        },
        {
          "delta": "${echoText}",
          "id": "${artifactId}",
          "type": "text-delta",
        },
        {
          "id": "${artifactId}",
          "type": "text-end",
        },
        {
          "finishReason": "stop",
          "type": "finish",
          "usage": {
            "inputTokens": undefined,
            "outputTokens": undefined,
            "totalTokens": undefined,
          },
        },
      ]
    `);
  }, 60000);

   it('tck hello', async () => {

    const model = provider(AGENT_URL, {
      "a2a": {
        "contextId": crypto.randomUUID(),
      }
    });

    const { content } = await model.doGenerate({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: "Hello!" }] }
      ],
    });

    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("Hello World! Nice to meet you!");
  }, 60000);


   it('tck how are you', async () => {

    const model = provider(AGENT_URL, {
      "a2a": {
        "contextId": crypto.randomUUID(),
      }
    });

    const { content } = await model.doGenerate({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: "How are you?" }] }
      ],
    });

    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("I'm doing great! Thanks for asking. How can I help you today?");
  }, 60000);


   it('tck goodbye', async () => {

    const model = provider(AGENT_URL, {
      "a2a": {
        "contextId": crypto.randomUUID(),
      }
    });

    const { content } = await model.doGenerate({
      prompt: [
        { role: 'user', content: [{ type: 'text', text: "goodbye" }] }
      ],
    });

    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("Goodbye! Have a wonderful day!");
  }, 60000);

});
