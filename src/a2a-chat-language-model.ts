import { A2AClient, Message, MessageSendParams, SendMessageResponse, SendMessageSuccessResponse, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent, FilePart, TextPart } from '@a2a-js/sdk';
import {
  LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2Prompt, LanguageModelV2Content, LanguageModelV2CallWarning,
  LanguageModelV2StreamPart,
  LanguageModelV2FilePart,
  UnsupportedFunctionalityError,
  LanguageModelV2FinishReason,
} from '@ai-sdk/provider';
import { convertAsyncIteratorToReadableStream, generateId, IdGenerator } from '@ai-sdk/provider-utils';

type A2AStreamEventData = Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

export type A2aChatSettings = object

export type A2aChatConfig = {
  readonly provider: string;
  readonly generateId?: IdGenerator;
}

export function mapFinishReason(event: TaskStatusUpdateEvent): LanguageModelV2FinishReason {
  if (event.status.state === "completed") {
    return 'stop';
  }

  if (event.status.state === "input-required") {
    return 'stop';
  }

  if (event.status.state === "auth-required") {
    return 'error';
  }

  if (event.status.state === "failed") {
    return 'error';
  }

  if (event.status.state === "canceled") {
    return 'other';
  }

  if (event.status.state === "rejected") {
    return 'error';
  }

  if (event.status.state === "submitted") {
    return 'stop';
  }

  if (event.status.state === "unknown") {
    return 'unknown';
  }

  if (event.status.state === "working") {
    return 'unknown';
  }

  return 'unknown';
}

export function getResponseMetadata(event: A2AStreamEventData) {
  if (event.kind === "task") {
    return {
      id: event.id,
      modelId: undefined,
      timestamp: event.status.timestamp ? new Date(event.status.timestamp) : undefined
    }
  }
  if (event.kind === "message") {
    return {
      id: event.messageId,
      modelId: undefined,
      timestamp: undefined
    }
  }

  if (event.kind === "status-update") {
    return {
      id: event.taskId,
      modelId: undefined,
      timestamp: event.status.timestamp ? new Date(event.status.timestamp) : undefined
    }
  }

  if (event.kind === "artifact-update") {
    return {
      id: event.taskId,
      modelId: undefined,
      timestamp: undefined
    }
  }

  console.log('Unknown event kind to get getResponseMetadata', event);

  return {
  }
}

function isErrorResponse(
  response: SendMessageResponse
): boolean {
  return 'error' in response;
}

class A2aChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: string;
  readonly modelId: string;
  private readonly config: A2aChatConfig;


  constructor(
    modelId: string,
    settings: A2aChatSettings,
    config: A2aChatConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.config = config;
    // Initialize with settings and config
  }

  // Convert AI SDK prompt to provider format
  private getArgs(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    // Map messages to provider format
    const messages = this.convertToProviderMessages(options.prompt);

    if (options.tools) {
      throw new UnsupportedFunctionalityError({
        functionality: "tools",
        message: "We don't support tools, yet."
      });
    }

    const tools = undefined;

    const body = {
      model: this.modelId,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens,
      stop: options.stopSequences,
      tools
    };

    return { args: body, warnings };
  }

  async doGenerate(
    options: Parameters<LanguageModelV2['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>> {
    const { args, warnings } = this.getArgs(options);

    const client = new A2AClient(this.modelId);
    const card = await client.getAgentCard();
    console.log('card', card)
    console.log('args', args)

    if (args.messages.length < 1) {
      throw new Error('Cannot handle zero messages!');
    }

    const message = args.messages[args.messages.length - 1];

    const sendParams: MessageSendParams = {
      message,
      configuration: {
        blocking: true,
        acceptedOutputModes: ['text/plain']
      }
    };

    if (options.providerOptions?.a2a?.contextId) {
      sendParams.message.contextId = options.providerOptions?.a2a?.contextId as string;
    }

    console.log('sendParams', sendParams.message.parts)

    const sendResponse: SendMessageResponse = await client.sendMessage(sendParams);

    if (isErrorResponse(sendResponse)) {
      throw new Error("Error sending message:" + (sendResponse as { error: { message: string } }).error.message);
    }

    // On success, the result can be a Task or a Message. Check which one it is.
    const response = (sendResponse as SendMessageSuccessResponse).result;

    // Convert provider response to AI SDK format
    const content: LanguageModelV2Content[] = this.convertProviderResponseToContent(response);

    return {
      content,
      finishReason: "stop", // this.mapFinishReason(response.choices[0].finish_reason),
      usage: {
        inputTokens: undefined, // response.usage?.prompt_tokens,
        outputTokens: undefined, // response.usage?.completion_tokens,
        totalTokens: undefined, // response.usage?.total_tokens,
      },
      request: { body: args },
      response: { body: response },
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV2['doStream']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>> {
    const { args, warnings } = this.getArgs(options);

    const client = new A2AClient(this.modelId);
    const card = await client.getAgentCard();
    console.log('card', card)

    if (args.messages.length < 1) {
      throw new Error('Cannot handle less then one message!');
    }



    const message = args.messages[args.messages.length - 1];

    if (options.providerOptions?.a2a?.contextId) {
      message.contextId = options.providerOptions?.a2a?.contextId as string;
    }

    try {
      console.log(`\n--- Starting streaming task for message ${message.messageId} ---`);

      // Construct the `MessageSendParams` object.
      const streamParams: MessageSendParams = {
        message
      };

      // Use the `sendMessageStream` method.
      const response = client.sendMessageStream(streamParams);
      let currentTaskId: string | undefined;
      let isFirstChunk = true;
      const activeArtifactIds = new Set<string>();
      let finishReason: LanguageModelV2FinishReason = 'unknown';

      return {
        stream: convertAsyncIteratorToReadableStream(response).pipeThrough(
          new TransformStream<
            A2AStreamEventData,
            LanguageModelV2StreamPart
          >({
            start(controller) {
              controller.enqueue({ type: 'stream-start', warnings });
            },

            transform(event, controller) {
              console.log('found event', event);
              // Emit raw chunk if requested (before anything else)
              if (options.includeRawChunks) {
                controller.enqueue({ type: 'raw', rawValue: event });
              }

              //if (!event.success) {
              //  controller.enqueue({ type: 'error', error: event.error });
              //  return;
              //}

              if (isFirstChunk) {
                isFirstChunk = false;

                controller.enqueue({
                  type: 'response-metadata',
                  ...getResponseMetadata(event),
                });
              }

              // Differentiate subsequent stream events.
              if (event.kind === 'status-update') {
                console.log(
                  `[${event.taskId}] Status Update: ${event.status.state}
                  }`
                );
                if (event.final) {
                  console.log(`[${event.taskId}] Stream marked as final.`);
                  finishReason = mapFinishReason(event)
                }
              } else if (event.kind === 'artifact-update') {
                // Use artifact.name or artifact.artifactId for identification
                console.log(
                  `[${event.taskId}] Artifact Update: ${event.artifact.name ?? event.artifact.artifactId
                  } - Part Count: ${event.artifact.parts.length}`
                );

                event.artifact.parts.forEach((part) => {
                  console.log('  o ' + JSON.stringify(part));
                })

                if (!activeArtifactIds.has(event.artifact.artifactId)) {
                  controller.enqueue({ type: 'text-start', id: event.artifact.artifactId });
                  activeArtifactIds.add(event.artifact.artifactId);
                }

                const textContent = event.artifact.parts.filter((part) => part.kind === "text").map((part) => {
                  return (part).text;
                }).join(' ');

                controller.enqueue({
                  type: 'text-delta',
                  id: event.artifact.artifactId,
                  delta: textContent,
                });

              } else {
                if (event.kind === "task") {
                  console.log(`[${currentTaskId}] Task created. Status: ${event.status.state}`);
                }

                console.log('event', event);
                // This could be a direct Message response if the agent doesn't create a task.
                if (isFirstChunk) {
                  isFirstChunk = false;
                  controller.enqueue({
                    type: 'response-metadata',
                    ...getResponseMetadata(event),
                  });
                }

                if (event.kind === "task" && event.status.message) {
                  controller.enqueue({ type: 'text-start', id: event.status.message.messageId });
                  for (const part of event.status.message.parts) {
                    if (part.kind === "text") {
                      controller.enqueue({
                        type: 'text-delta',
                        id: event.status.message.messageId,
                        delta: part.text,
                      });
                    }
                    // FIXME: handle part.kind == "data"
                    // FIXME: handle part.kind == "file"
                  }
                  controller.enqueue({ type: 'text-end', id: event.status.message.messageId });
                }
                if (event.kind === "task" && event.artifacts) {
                  if (event.artifacts) {
                    for (const artifact of event.artifacts) {
                      controller.enqueue({ type: 'text-start', id: artifact.artifactId });
                      for (const part of artifact.parts) {
                        if (part.kind === "text") {
                          controller.enqueue({
                            type: 'text-delta',
                            id: artifact.artifactId,
                            delta: part.text,
                          });
                        }
                        // FIXME: handle part.kind == "data"
                        // FIXME: handle part.kind == "file"
                      }
                      controller.enqueue({ type: 'text-end', id: artifact.artifactId });
                    }
                  }
                }

                if (event.kind === "message") {
                  controller.enqueue({ type: 'text-start', id: event.messageId });
                  for (const part of event.parts) {
                    if (part.kind === "text") {
                      controller.enqueue({
                        type: 'text-delta',
                        id: event.messageId,
                        delta: part.text,
                      });
                    }
                    // FIXME: handle part.kind == "data"
                    // FIXME: handle part.kind == "file"
                  }
                  controller.enqueue({ type: 'text-end', id: event.messageId });
                }

                finishReason = 'stop';
              }
            },

            flush(controller) {
              activeArtifactIds.forEach((activeArtifactId) => {
                controller.enqueue({ type: 'text-end', id: activeArtifactId });
              })

              controller.enqueue({
                type: 'finish',
                finishReason,
                usage: {
                  inputTokens: undefined,
                  outputTokens: undefined,
                  totalTokens: undefined,
                },
              });
            },
          }),
        ),
      };

    } catch (error) {
      throw new Error(`Error during streaming for message ${message.messageId}:` + error);
    }
  }

  private convertToProviderMessages(prompt: LanguageModelV2Prompt): Message[] {
    return prompt.filter((message) => message.role === "assistant" || message.role === "user").map((message) => {
      return {
        role: message.role === 'assistant' ? 'agent' : 'user',
        kind: "message",
        messageId: generateId(),
        parts: message.content.map((part) => {
          if (part.type === "text") {
            return { kind: 'text', text: part.text } as TextPart;
          }
          if (part.type === "file") {
            return this.convertFileToPart(part);
          }
          throw new Error(`Unsupported part type: ${part.type}`);
        }),
      };
    });
  };

  private convertProviderResponseToContent(response: Task | Message): LanguageModelV2Content[] {
    const content: LanguageModelV2Content[] = [];

    if (response.kind === "message") {
      response.parts.forEach((part) => {
        if (part.kind === "text") {
          content.push({
            type: 'text',
            text: part.text
          });
        }
        if (part.kind === "file") {
          /* FIXME: handle file */
        }
        if (part.kind === "data") {
          /* FIXME: handle data */
        }
      });
    }

    if (response.kind === "task") {
      if (response.status.message) {
        response.status.message.parts.forEach((part) => {
          if (part.kind === "text") {
            content.push({
              type: 'text',
              text: part.text
            });
          }
          if (part.kind === "file") {
            /* FIXME: handle file */
          }
          if (part.kind === "data") {
            /* FIXME: handle data */
          }
        });
      }
      response.artifacts?.forEach((artifact) => {
        artifact.parts.forEach((part) => {
          if (part.kind === "text") {
            content.push({
              type: 'text',
              text: part.text
            });
          }
          if (part.kind === "file") {
            /* FIXME: handle file */
          }
          if (part.kind === "data") {
            /* FIXME: handle data */
          }
        })
      })
    }

    return content;
  }

  private convertFileToPart(part: LanguageModelV2FilePart): FilePart {
    if (part.type !== "file") {
      throw new UnsupportedFunctionalityError({
        functionality:
          'Unsupported file part of type ' + part.type,
      });
    }

    if (part.data instanceof URL) {
      return {
        kind: 'file',
        file: {
          mimeType: part.mediaType,
          name: part.filename,
          uri: part.data.toString(),
        }
      }
    }

    return {
      kind: 'file',
      file: {
        mimeType: part.mediaType,
        name: part.filename,
        bytes: Buffer.from(part.data).toString('base64')
      }
    }
  }

  readonly supportedUrls: Record<string, RegExp[]> = {
    '*/*': [/.+/],
  };
}

export { A2aChatLanguageModel }