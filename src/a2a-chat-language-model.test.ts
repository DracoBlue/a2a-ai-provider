import { LanguageModelV2Prompt } from '@ai-sdk/provider';
import {
    convertReadableStreamToArray,
    createTestServer,
} from '@ai-sdk/provider-utils/test';
import { createA2a } from './a2a-provider';
import { describe, it, expect } from 'vitest';

const TEST_PROMPT: LanguageModelV2Prompt = [
    { role: 'user', content: [{ type: 'text', text: "tell me a joke" }] },
];
const base64encodedTransparentGif = `R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;


const provider = createA2a({});
const model = provider('http://localhost:41241');

const server = createTestServer({
    // hello world
    'http://localhost:41241/.well-known/agent.json': {},
    'http://localhost:41241/': {}
});


describe('doGenerate', () => {

    function prepareJsonResponse({
        result,
        headers,
    }: {
        content?: string;
        result?: object;
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

    it('Server responds with files in artifacts', async () => {

        const contextId = "context-id-uuid";
        const taskId = "task-id-uuid";

        prepareJsonResponse({
            result: {
                artifacts: [
                    {
                        artifactId: "7d3371fd-002c-4008-8ef1-1c58674cc2ba",
                        description: "",
                        name: "chart_b4e5f4d5-fe7a-4458-b914-182d3555cc64",
                        parts: [
                            {
                                file: {
                                    bytes: base64encodedTransparentGif,
                                    mimeType: "image/png",
                                    name: "generated_chart.png",
                                },
                                kind: "file",
                            },
                        ],
                    },
                ],
                contextId: contextId,
                history: [
                    {
                        contextId: contextId,
                        kind: "message",
                        messageId: "sent-message-id-uuid",
                        parts: [
                            {
                                kind: "text",
                                text: "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500",
                            },
                        ],
                        role: "user",
                        taskId: taskId,
                    },
                ],
                id: taskId,
                kind: "task",
                status: {
                    state: "completed",
                },
            }
        });

        const { content } = await model.doGenerate({
            prompt: [
                {
                    content: [
                        {
                            type: "text",
                            "text": "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500"
                        }
                    ],
                    role: "user",

                }
            ],
        });
        console.log(content);

        expect(content).toMatchInlineSnapshot(`[
  {
    "data": Uint8Array [
      71,
      73,
      70,
      56,
      57,
      97,
      1,
      0,
      1,
      0,
      128,
      0,
      0,
      0,
      0,
      0,
      255,
      255,
      255,
      33,
      249,
      4,
      1,
      0,
      0,
      0,
      0,
      44,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      1,
      68,
      0,
      59,
    ],
    "mediaType": "image/png",
    "type": "file",
  },
]`);
    });
});

describe('doStream', () => {
    function prepareStreamResponse({
        chunks,
        headers,
    }: {
        chunks: object[],
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
            chunks: chunks.map((rawChunk: object) => {
                return `data:  ${JSON.stringify(rawChunk)}\n\n`;
            })
            // `data: [DONE]\n\n`,
            ,
        };
    }

    it('Server respondes with task, 4x artifact-update, status-update', async () => {
        const taskId = "task-id-uuid";
        const contextId = "context-id-uuid";
        const artifactId = "artifact-id-uuid";
        const messageId = "message-id-uuid";

        prepareStreamResponse({
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "id": taskId,
                        "contextId": contextId,
                        "status": {
                            "state": "submitted",
                            "timestamp": "2025-04-02T16:59:25.331844"
                        },
                        "history": [
                            {
                                "role": TEST_PROMPT[0].role === "assistant" ? "agent" : "user",
                                "parts": TEST_PROMPT[0].content,
                                "messageId": messageId,
                                "taskId": taskId,
                                "contextId": contextId
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
                        "taskId": taskId,
                        "contextId": contextId,
                        "artifact": {
                            "artifactId": artifactId,
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
                        "taskId": taskId,
                        "contextId": contextId,
                        "artifact": {
                            "artifactId": artifactId,
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
                        "taskId": taskId,
                        "contextId": contextId,
                        "artifact": {
                            "artifactId": artifactId,
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
                        "taskId": taskId,
                        "contextId": contextId,
                        "status": {
                            "state": "completed",
                            "timestamp": "2025-04-02T16:59:35.331844"
                        },
                        "final": true,
                        "kind": "status-update"
                    }
                }

            ]
        });

        const { stream } = await model.doStream({
            prompt: TEST_PROMPT,
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

        expect(array).toMatchInlineSnapshot(`
      [
        {
          "type": "stream-start",
          "warnings": [],
        },
        {
          "id": "${taskId}",
          "modelId": undefined,
          "timestamp": ${(new Date("2025-04-02T16:59:25.331844")).toISOString()},
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



    it('Server respondes with message', async () => {
        const contextId = "context-id-uuid";
        const messageId = "message-id-uuid";

        prepareStreamResponse({
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "messageId": messageId,
                        "contextId": contextId,
                        "parts": [
                            {
                                "kind": "text",
                                "text": "<section 1...><section 2...><section 3...>"
                            }
                        ],
                        "kind": "message",
                        "metadata": {}
                    }
                }
            ]
        });

        const { stream } = await model.doStream({
            prompt: TEST_PROMPT,
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

        expect(array).toMatchInlineSnapshot(`
      [
        {
          "type": "stream-start",
          "warnings": [],
        },
        {
          "id": "${messageId}",
          "modelId": undefined,
          "timestamp": undefined,
          "type": "response-metadata",
        },
        {
          "id": "${messageId}",
          "type": "text-start",
        },
        {
          "delta": "<section 1...><section 2...><section 3...>",
          "id": "${messageId}",
          "type": "text-delta",
        },
        {
          "id": "${messageId}",
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

    it('Server responds with files in artifacts', async () => {

        const contextId = "context-id-uuid";
        const taskId = "task-id-uuid";

        prepareStreamResponse({
            chunks: [
                {
                    id: 1,
                    jsonrpc: "2.0",
                    result: {
                        artifacts: [
                            {
                                artifactId: "7d3371fd-002c-4008-8ef1-1c58674cc2ba",
                                description: "",
                                name: "chart_b4e5f4d5-fe7a-4458-b914-182d3555cc64",
                                parts: [
                                    {
                                        file: {
                                            bytes: base64encodedTransparentGif,
                                            mimeType: "image/png",
                                            name: "generated_chart.png",
                                        },
                                        kind: "file",
                                    },
                                ],
                            },
                        ],
                        contextId: contextId,
                        history: [
                            {
                                contextId: contextId,
                                kind: "message",
                                messageId: "sent-message-id-uuid",
                                parts: [
                                    {
                                        kind: "text",
                                        text: "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500",
                                    },
                                ],
                                role: "user",
                                taskId: taskId,
                            },
                        ],
                        id: taskId,
                        kind: "task",
                        status: {
                            state: "completed",
                        },
                    },
                }
            ]
        });

        const { stream } = await model.doStream({
            prompt: [
                {
                    content: [
                        {
                            type: "text",
                            "text": "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500"
                        }
                    ],
                    role: "user",

                }
            ],
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

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
          "data": "${base64encodedTransparentGif}",
          "mediaType": "image/png",
          "type": "file",
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

    it('Server responds with files in artifact-update', async () => {

        const contextId = "context-id-uuid";
        const taskId = "task-id-uuid";
        const artifactId = "artifact-id-uuid";
        const base64encodedTransparentGif = `R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;

        prepareStreamResponse({
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "id": taskId,
                        "contextId": contextId,
                        "status": {
                            "state": "submitted",
                        },
                        "history": [
                            {
                                "role": "user",
                                "parts": [
                                    {
                                        text: "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500",
                                        type: "text"
                                    }
                                ],
                                "taskId": taskId,
                                "contextId": contextId
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
                        "taskId": taskId,
                        "contextId": contextId,
                        "artifact": {
                            "artifactId": artifactId,
                            "parts": [
                                {
                                    file: {
                                        bytes: base64encodedTransparentGif,
                                        mimeType: "image/png",
                                        name: "generated_chart.png",
                                    },
                                    kind: "file",
                                },]
                        },
                        "append": true,
                        "lastChunk": true,
                        "kind": "artifact-update"
                    }
                },
                {
                    id: 1,
                    jsonrpc: "2.0",
                    result: {
                        contextId: contextId,
                        history: [
                            {
                                contextId: contextId,
                                kind: "message",
                                messageId: "sent-message-id-uuid",
                                parts: [
                                    {
                                        kind: "text",
                                        text: "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500",
                                    },
                                ],
                                role: "user",
                                taskId: taskId,
                            },
                        ],
                        id: taskId,
                        kind: "task",
                        status: {
                            state: "completed",
                        },
                    },
                }
            ]
        });

        const { stream } = await model.doStream({
            prompt: [
                {
                    content: [
                        {
                            type: "text",
                            "text": "Generate a chart of revenue: Jan,$1000 Feb,$2000 Mar,$1500"
                        }
                    ],
                    role: "user",

                }
            ],
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

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
          "data": "${base64encodedTransparentGif}",
          "mediaType": "image/png",
          "type": "file",
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

    it('Server respondes with task (input-required)', async () => {
        const taskId = "task-id-uuid";
        const contextId = "context-id-uuid";
        const messageId = "message-id-uuid";

        prepareStreamResponse({
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": "1",
                    "result": {
                        "id": taskId,
                        "contextId": contextId,
                        "status": {
                            "state": "input-required",
                            "message": {
                                "role": "agent",
                                "parts": [
                                    {
                                        "kind": "text",
                                        "text": "<section 1...><section 2...><section 3...>"
                                    }
                                ],
                                "messageId": messageId,
                                "taskId": taskId,
                                "contextId": contextId
                            },
                            "timestamp": "2024-03-15T10:10:00Z"
                        },
                        "history": [
                            {
                                "role": "user",
                                "parts": [
                                    {
                                        "kind": "text",
                                        "text": "I'd like to book a flight."
                                    }
                                ],
                                "messageId": messageId,
                                "taskId": taskId,
                                "contextId": contextId
                            }
                        ],
                        "kind": "task"
                    }
                }
            ]
        });

        const { stream } = await model.doStream({
            prompt: TEST_PROMPT,
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

        expect(array).toMatchInlineSnapshot(`
      [
        {
          "type": "stream-start",
          "warnings": [],
        },
        {
          "id": "${taskId}",
          "modelId": undefined,
          "timestamp": ${(new Date("2024-03-15T10:10:00Z")).toISOString()},
          "type": "response-metadata",
        },
        {
          "id": "${messageId}",
          "type": "text-start",
        },
        {
          "delta": "<section 1...><section 2...><section 3...>",
          "id": "${messageId}",
          "type": "text-delta",
        },
        {
          "id": "${messageId}",
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

    it('Server respondes with task (with artifacts)', async () => {
        const taskId = "task-id-uuid";
        const contextId = "context-id-uuid";
        const messageId = "message-id-uuid";
        const artifactId = "artifact-id-uuid";

        prepareStreamResponse({
            chunks: [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    result: {
                        "id": taskId,
                        "contextId": contextId,
                        "status": {
                            "state": "completed"
                        },
                        "artifacts": [
                            {
                                "artifactId": artifactId,
                                "name": "joke",
                                "parts": [
                                    {
                                        "kind": "text",
                                        "text": "<section 1...><section 2...><section 3...>"
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
                                "messageId": messageId,
                                "taskId": taskId,
                                "contextId": contextId
                            }
                        ],
                        "kind": "task",
                        "metadata": {}
                    }
                }
            ]
        });

        const { stream } = await model.doStream({
            prompt: TEST_PROMPT,
            includeRawChunks: false,
        });

        const array = await convertReadableStreamToArray(stream);

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
          "delta": "<section 1...><section 2...><section 3...>",
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
