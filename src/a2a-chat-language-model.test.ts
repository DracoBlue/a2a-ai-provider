import { LanguageModelV2Prompt } from '@ai-sdk/provider';
import {
    convertReadableStreamToArray,
    createTestServer,
} from '@ai-sdk/provider-utils/test';
import { createA2a } from './a2a-provider';
import { describe, it, expect } from 'vitest';
import { Part } from '@a2a-js/sdk';

const TEST_PROMPT: LanguageModelV2Prompt = [
    { role: 'user', content: [{ type: 'text', text: "tell me a joke" }] },
];

const provider = createA2a({ });
const model = provider('http://localhost:41241');

const server = createTestServer({
    // hello world
    'http://localhost:41241/.well-known/agent.json': {},
    'http://localhost:41241/': {}
});


describe('doGenerate', () => {

    function prepareJsonResponse({
        result,
        usage = {
            prompt_tokens: 4,
            total_tokens: 34,
            completion_tokens: 30,
        },
        id = '16362f24e60340d0994dd205c267a43a',
        created = 1711113008,
        headers,
    }: {
        content?: string;
        result?: object;
        usage?: {
            prompt_tokens: number;
            total_tokens: number;
            completion_tokens: number;
        };
        id?: string;
        created?: number;
        headers?: Record<string, string>;
    }) {
        server.urls['http://localhost:41241/.well-known/agent.json'].response = {
            type: 'json-value',
            headers,
            body: { "name": "Movie Agent", "description": "An agent that can answer questions about movies and actors using TMDB.", "url": "http://localhost:41241/", "provider": { "organization": "A2A Samples", "url": "https://example.com/a2a-samples" }, "version": "0.0.2", "capabilities": { "streaming": true, "pushNotifications": false, "stateTransitionHistory": true }, "defaultInputModes": ["text"], "defaultOutputModes": ["text", "task-status"], "skills": [{ "id": "general_movie_chat", "name": "General Movie Chat", "description": "Answer general questions or chat about movies, actors, directors.", "tags": ["movies", "actors", "directors"], "examples": ["Tell me about the plot of Inception.", "Recommend a good sci-fi movie.", "Who directed The Matrix?", "What other movies has Scarlett Johansson been in?", "Find action movies starring Keanu Reeves", "Which came out first, Jurassic Park or Terminator 2?"], "inputModes": ["text"], "outputModes": ["text", "task-status"] }], "supportsAuthenticatedExtendedCard": false },
        };
        server.urls['http://localhost:41241/'].response = {
            type: 'json-value',
            headers,
            body: {
                "jsonrpc": "2.0",
                "id": 1,
                "result": result
            },
        };
    }

    it('Client asks a simple question, and the agent responds quickly without a task', async () => {
        prepareJsonResponse({
            result: {
                "messageId": "363422be-b0f9-4692-a24d-278670e7c7f1",
                "contextId": "c295ea44-7543-4f78-b524-7a38915ad6e4",
                "parts": [
                    {
                        "kind": "text",
                        "text": "Hello, World!"
                    }
                ],
                "kind": "message",
                "metadata": {}
            }
        });

        const { content } = await model.doGenerate({
            prompt: TEST_PROMPT,
        });

        expect(content).toMatchInlineSnapshot(`
      [
        {
          "text": "Hello, World!",
          "type": "text",
        },
      ]
    `);
    });

    it('Client asks a simple question, and the agent responds quickly with a task', async () => {
        prepareJsonResponse({
            result: {
                "id": "363422be-b0f9-4692-a24d-278670e7c7f1",
                "contextId": "c295ea44-7543-4f78-b524-7a38915ad6e4",
                "status": {
                    "state": "completed"
                },
                "artifacts": [
                    {
                        "artifactId": "9b6934dd-37e3-4eb1-8766-962efaab63a1",
                        "name": "joke",
                        "parts": [
                            {
                                "kind": "text",
                                "text": "Why did the chicken cross the road? To get to the other side!"
                            }
                        ]
                    }
                ],
                "history": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "kind": "text",
                                "text": "tell me a joke"
                            }
                        ],
                        "messageId": "9229e770-767c-417b-a0b0-f0741243c589",
                        "taskId": "363422be-b0f9-4692-a24d-278670e7c7f1",
                        "contextId": "c295ea44-7543-4f78-b524-7a38915ad6e4"
                    }
                ],
                "kind": "task",
                "metadata": {}
            }
        });

        const { content } = await model.doGenerate({
            prompt: TEST_PROMPT,
        });

        expect(content).toMatchInlineSnapshot(`
      [
        {
          "text": "Why did the chicken cross the road? To get to the other side!",
          "type": "text",
        },
      ]
    `);
    });


});


describe('doStream', () => {
    function prepareStreamResponse({
        content,
        headers,
    }: {
        content: Part[],
        headers?: Record<string, string>;
    }) {

        server.urls['http://localhost:41241/.well-known/agent.json'].response = {
            type: 'json-value',
            headers,
            body: { "name": "Movie Agent", "description": "An agent that can answer questions about movies and actors using TMDB.", "url": "http://localhost:41241/", "provider": { "organization": "A2A Samples", "url": "https://example.com/a2a-samples" }, "version": "0.0.2", "capabilities": { "streaming": true, "pushNotifications": false, "stateTransitionHistory": true }, "defaultInputModes": ["text"], "defaultOutputModes": ["text", "task-status"], "skills": [{ "id": "general_movie_chat", "name": "General Movie Chat", "description": "Answer general questions or chat about movies, actors, directors.", "tags": ["movies", "actors", "directors"], "examples": ["Tell me about the plot of Inception.", "Recommend a good sci-fi movie.", "Who directed The Matrix?", "What other movies has Scarlett Johansson been in?", "Find action movies starring Keanu Reeves", "Which came out first, Jurassic Park or Terminator 2?"], "inputModes": ["text"], "outputModes": ["text", "task-status"] }], "supportsAuthenticatedExtendedCard": false },
        };
        server.urls['http://localhost:41241/'].response = {
            type: 'stream-chunks',
            headers,
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "id": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                        "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1",
                        "status": {
                            "state": "submitted",
                            "timestamp": "2025-04-02T16:59:25.331844"
                        },
                        "history": [
                            {
                                "role": "user",
                                "parts": content,
                                "messageId": "bbb7dee1-cf5c-4683-8a6f-4114529da5eb",
                                "taskId": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                                "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1"
                            }
                        ],
                        "kind": "task",
                        "metadata": {}
                    }
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "taskId": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                        "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1",
                        "artifact": {
                            "artifactId": "9b6934dd-37e3-4eb1-8766-962efaab63a1",
                            "parts": [
                                { "kind": "text", "text": "<section 1...>" }
                            ]
                        },
                        "append": false,
                        "lastChunk": false,
                        "kind": "artifact-update"
                    }
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "taskId": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                        "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1",
                        "artifact": {
                            "artifactId": "9b6934dd-37e3-4eb1-8766-962efaab63a1",
                            "parts": [
                                { "kind": "text", "text": "<section 2...>" }
                            ],
                        },
                        "append": true,
                        "lastChunk": false,
                        "kind": "artifact-update"
                    }
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "taskId": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                        "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1",
                        "artifact": {
                            "artifactId": "9b6934dd-37e3-4eb1-8766-962efaab63a1",
                            "parts": [
                                { "kind": "text", "text": "<section 3...>" }
                            ]
                        },
                        "append": true,
                        "lastChunk": true,
                        "kind": "artifact-update"
                    }
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "taskId": "225d6247-06ba-4cda-a08b-33ae35c8dcfa",
                        "contextId": "05217e44-7e9f-473e-ab4f-2c2dde50a2b1",
                        "status": {
                            "state": "completed",
                            "timestamp": "2025-04-02T16:59:35.331844"
                        },
                        "final": true,
                        "kind": "status-update"
                    }
                }

            ].map((rawChunk) => {
                return `data:  ${JSON.stringify(rawChunk)}\n\n`;
            })
            // `data: [DONE]\n\n`,
            ,
        };
    }

    it('Client asks the agent to write a long paper describing an attached picture.', async () => {
        prepareStreamResponse({
            content: [{ kind: 'text', text: "write a long paper describing the attached pictures" }, {
                "kind": "file",
                "file": {
                    "mimeType": "image/png",
                    uri: "https://example.org/favicon.ico"
                }
            }]
        });

        const { stream } = await model.doStream({
            prompt: TEST_PROMPT,
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);
        const messageId = array.find((item) => item.type === "response-metadata")?.id;
        const artifactId = array.find((item) => item.type === "text-start")?.id;

        expect(array).toMatchInlineSnapshot(`
      [
        {
          "type": "stream-start",
          "warnings": [],
        },
        {
          "id": "${messageId}",
          "modelId": undefined,
          "timestamp": 2025-04-02T14:59:25.331Z,
          "type": "response-metadata",
        },
        {
          "id": "${artifactId}",
          "type": "text-start",
        },
        {
          "delta": "<section 1...>",
          "id": "${artifactId}",
          "type": "text-delta",
        },
        {
          "delta": "<section 2...>",
          "id": "${artifactId}",
          "type": "text-delta",
        },
        {
          "delta": "<section 3...>",
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
    });
});
