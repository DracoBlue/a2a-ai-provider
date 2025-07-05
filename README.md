# a2a-ai-provider

An `@ai-sdk` compatible AI provider implementation for the [A2A Protocol](https://a2aproject.github.io/A2A/), enabling universal interoperability between LLMs, tools, streaming output, and file-based artifacts.

> **Hint**: Is currently in alpha, not feature complete and should not be used for production workloads.

## ✨ Features

- 🔌 Drop-in `ai` Provider (v5 and later)
- 🔁 Full support for A2A JSON-RPC 2.0 API by using `@a2a-js/sdk`
- ⚖️ MIT Licensed and easy to integrate

## 📦 Installation

```bash
pnpm install a2a-ai-provider
```

Make sure you also install `ai` (v5 which is currently @beta):

```bash
pnpm install ai@beta
```

## 🚀 Usage

```javascript
import { a2a } from "a2a-ai-provider";
import { generateText } from "ai"

const chatId = "unique-chat-id"; // for each conversation to keep history in a2a server

const result = await generateText({
  model: a2a('https://your-a2a-server.example.com'),
  prompt: 'What is love?',
  providerOptions: {
    "a2a": {
      "contextId": chatId,
    }
  },
});

console.log(result.text);
```

## 🛠 Provider Options

```ts
createA2a({
  idGenerator?: IdGenerator; // replace the default IdGenerator
});
```

## 🔒 License

a2a-ai-provider is licensed under the terms of MIT. See LICENSE for more information.