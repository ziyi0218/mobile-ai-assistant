import apiClient from "./apiClient";

export interface AboutVersionUpdates {
  current: string;
  latest: string;
}

export interface AboutReleaseNoteItem {
  content: string;
}

export interface AboutReleaseNotesVersion {
  date: string;
  added?: AboutReleaseNoteItem[];
  fixed?: AboutReleaseNoteItem[];
  changed?: AboutReleaseNoteItem[];
}

const RELEASE_NOTES: Record<string, AboutReleaseNotesVersion> = {
  "0.7.2": {
    date: "2026-01-10",
    fixed: [
      {
        content:
          "⚡ Users no longer experience database connection timeouts under high concurrency due to connections being held during LLM calls, telemetry collection, and file status streaming.",
      },
      {
        content:
          "📝 Users can now create and save prompts in the workspace prompts editor without encountering errors.",
      },
      {
        content:
          "🎙️ Users can now use local Whisper for speech-to-text when STT_ENGINE is left empty (the default for local mode).",
      },
      {
        content:
          "📊 The Evaluations page now loads faster by eliminating duplicate API calls to the leaderboard and feedbacks endpoints.",
      },
      {
        content: "🌐 Fixed missing Settings tab i18n label keys.",
      },
    ],
  },
  "0.7.1": {
    date: "2026-01-09",
    fixed: [
      {
        content:
          "⚡ Improved reliability for low-spec and SQLite deployments. Fixed page timeouts by disabling database session sharing by default, improving stability for resource-constrained environments.",
      },
    ],
  },
  "0.7.0": {
    date: "2026-01-09",
    added: [
      {
        content:
          '🤖 Native Function Calling with Built-in Tools. Users can now ask models to perform multi-step tasks that combine web research, knowledge base queries, note-taking, and image generation in a single conversation.',
      },
      {
        content:
          "🧠 Users can now ask the model to find relevant context from their notes, past chats, and channel messages.",
      },
      {
        content:
          "📚 Users can now ask the model to search their knowledge bases and retrieve documents without manually attaching files.",
      },
      {
        content:
          "💭 Users with models that support interleaved thinking now get more refined results from multi-step workflows.",
      },
      {
        content:
          "🔍 When models invoke web search, search results appear as clickable citations in real-time for full source verification.",
      },
      {
        content:
          "🎚️ Users can selectively disable specific built-in tools per model via the model editor's capabilities settings.",
      },
      {
        content:
          "👁️ Pending tool calls are now displayed during response generation, so users know which tools are being invoked.",
      },
      {
        content:
          '📁 Administrators can now limit the number of files that can be uploaded to folders using the "FOLDER_MAX_FILE_COUNT" setting.',
      },
      {
        content:
          "⚡ Users experience transformative speed improvements across the entire application through reengineered database connection handling.",
      },
      {
        content:
          "🚀 Users experience significantly faster initial page load times through dynamic loading of document processing libraries.",
      },
      {
        content:
          "💨 Administrators experience dramatically faster user list loading through optimized database queries.",
      },
      {
        content:
          "📋 Notes now load faster through optimized database queries that batch user lookups instead of fetching each note's author individually.",
      },
      {
        content:
          "💬 Channel messages, pinned messages, and thread replies now load faster through batched user lookups instead of individual queries per message.",
      },
      {
        content:
          "🔗 Users can now click citation content links to jump directly to the relevant portion of source documents with automatic text highlighting.",
      },
      {
        content:
          "📌 Users can now pin or hide models directly from the Workspace Models page and Admin Settings Models page.",
      },
      {
        content:
          "🔎 Administrators can now quickly find settings using the new search bar in the Admin Settings sidebar.",
      },
      {
        content:
          '🎛️ Users can now view read-only models in the workspace models list, with clear "Read Only" badges.',
      },
      {
        content:
          '📝 Users can now view read-only prompts in the workspace prompts list, with clear "Read Only" badges.',
      },
      {
        content:
          '🔧 Users can now view read-only tools in the workspace tools list, with clear "Read Only" badges.',
      },
      {
        content:
          "📂 Searching for files is now significantly faster, especially for users with large file collections.",
      },
      {
        content:
          "🏆 The Evaluations leaderboard now calculates Elo ratings on the backend instead of in the browser.",
      },
      {
        content:
          "📊 The Evaluations leaderboard now includes a per-model activity chart displaying daily wins and losses.",
      },
      {
        content:
          "🎞️ Users can now upload animated GIF and WebP formats as model profile images, with animation preserved.",
      },
      {
        content:
          "📸 Users uploading profile images now benefit from WebP compression at 80% quality instead of JPEG.",
      },
      {
        content:
          '⭐ Action Function developers can now update message favorite status using the new "chat:message:favorite" event.',
      },
      {
        content:
          "🌐 Users with OpenAI-compatible models that have web search capabilities now see URL citations displayed as sources.",
      },
      {
        content:
          '📰 Users can now dismiss the "What\'s New" changelog modal permanently using the X button.',
      },
      {
        content:
          "📧 Administrators can now configure the admin contact email displayed in the Account Pending overlay directly from the Admin Panel.",
      },
      {
        content:
          '📄 Administrators can now enable markdown header text splitting through the new "ENABLE_MARKDOWN_HEADER_TEXT_SPLITTER" setting.',
      },
      {
        content:
          '🧩 Administrators can now set a minimum chunk size target using the "CHUNK_MIN_SIZE_TARGET" setting.',
      },
      {
        content:
          '💨 Administrators can now enable KV prefix caching optimization by setting "RAG_SYSTEM_CONTEXT" to true.',
      },
      {
        content:
          "🖼️ Administrators and Action developers can now control image generation denoising steps per-request.",
      },
      {
        content:
          '🗄️ Administrators running multi-pod deployments can now designate a master pod to handle database migrations using "ENABLE_DB_MIGRATIONS".',
      },
      {
        content:
          '🎙️ Administrators can now configure Whisper\'s compute type using the "WHISPER_COMPUTE_TYPE" environment variable.',
      },
      {
        content:
          '🔍 Administrators can now control sigmoid normalization for CrossEncoder reranking models using "SENTENCE_TRANSFORMERS_CROSS_ENCODER_SIGMOID_ACTIVATION_FUNCTION".',
      },
      {
        content:
          '🔒 Administrators can now disable SSL certificate verification for external tools using the "REQUESTS_VERIFY" environment variable.',
      },
      {
        content:
          '📈 Administrators can now control audit log output destinations using "ENABLE_AUDIT_STDOUT" and "ENABLE_AUDIT_LOGS_FILE".',
      },
      {
        content:
          "🛡️ Administrators can now restrict non-admin user access to Interface Settings through per-user or per-group permissions.",
      },
      {
        content:
          "🧠 Administrators can now globally enable or disable the Memories feature and control access through per-user or per-group permissions.",
      },
      {
        content:
          '🟢 Administrators can now globally enable or disable user status visibility through the "ENABLE_USER_STATUS" setting.',
      },
      {
        content:
          "🪝 Channel managers can now create webhooks to allow external services to post messages to channels without authentication.",
      },
      {
        content:
          '📄 In the model editor users can now disable the "File Context" capability to skip automatic file content extraction.',
      },
      {
        content:
          "🔊 In the model editor users can now configure a specific TTS voice for each model.",
      },
      {
        content:
          '👥 Administrators now have three granular group sharing permission options instead of a simple on/off toggle.',
      },
      {
        content:
          "📦 Administrators can now export knowledge bases as zip files containing text files for backup and archival purposes.",
      },
      {
        content:
          '🚀 Administrators can now create an admin account automatically at startup via "WEBUI_ADMIN_EMAIL", "WEBUI_ADMIN_PASSWORD", and "WEBUI_ADMIN_NAME".',
      },
      {
        content:
          "🦆 Administrators can now select a specific search backend for DDGS instead of random selection.",
      },
      {
        content:
          '🧭 Administrators can now configure custom Jina Search API endpoints using the "JINA_API_BASE_URL" environment variable.',
      },
      {
        content:
          '🔥 Administrators can now configure Firecrawl timeout values using the "FIRECRAWL_TIMEOUT" environment variable.',
      },
      {
        content:
          "💾 Administrators can now use openGauss as the vector database backend for knowledge base document storage and retrieval.",
      },
      {
        content:
          "🔄 Various improvements were implemented across the application to enhance performance, stability, and security.",
      },
      {
        content:
          "📊 Users can now sync their anonymous usage statistics to the Open WebUI Community platform while keeping conversations private.",
      },
      {
        content:
          "🌐 Translations for multiple languages were enhanced and expanded.",
      },
    ],
    fixed: [
      {
        content:
          "🔊 Text-to-speech now correctly splits on newlines in addition to punctuation.",
      },
      {
        content:
          "🔒 Users are now protected from stored XSS vulnerabilities in iFrame embeds for citations and response messages.",
      },
      {
        content:
          "🔑 Image Generation, Web Search, and Audio API endpoints now enforce permission checks on the backend.",
      },
      {
        content:
          "🛠️ Tools and Tool Servers now enforce access control checks on the backend.",
      },
      {
        content:
          "🔁 System prompts are no longer duplicated when using native function calling.",
      },
      {
        content:
          '🗂️ Knowledge base uploads to folders no longer fail when "FOLDER_MAX_FILE_COUNT" is unset.',
      },
      {
        content:
          '📝 The "Create Note" button in the chat input now correctly hides for users without Notes permissions.',
      },
      {
        content:
          "📊 The Evaluations page no longer crashes when administrators have large amounts of feedback data.",
      },
      {
        content:
          "💬 Users can now export chats, use the Ask/Explain popup, and view chat lists correctly again after recent refactoring changes.",
      },
      {
        content:
          "💭 Users no longer experience data corruption when switching between chats during background operations like image generation.",
      },
      {
        content:
          "🛡️ Users no longer encounter critical chat stability errors, including duplicate key errors and null message access.",
      },
      {
        content:
          "📡 Users with Channels no longer experience infinite recursion and connection pool exhaustion when fetching threaded replies.",
      },
      {
        content:
          "📎 Users no longer encounter TypeError crashes when viewing messages with file attachments that have undefined URL properties.",
      },
      {
        content:
          "🔐 Users with MCP integrations now experience reliable OAuth 2.1 token refresh after access token expiration.",
      },
      {
        content:
          "📚 Users who belong to multiple groups can now see Knowledge Bases shared with those groups.",
      },
      {
        content:
          '📂 Users now see the correct Knowledge Base name when hovering over # file references in chat input instead of "undefined".',
      },
      {
        content:
          "📋 Users now see notes displayed in correct chronological order within their time range groupings.",
      },
      {
        content:
          "📑 Users collaborating on notes now experience proper content sync when initializing from both HTML and JSON formats.",
      },
      {
        content:
          '🔎 Users searching notes can now find hyphenated words and variations with spaces, so searching "todo" finds "to-do" and "to do".',
      },
      {
        content:
          "📥 Users no longer experience false duplicate file warnings when reuploading files after initial processing failed.",
      },
      {
        content:
          "💾 Users experience significantly improved page load performance as model profile images now cache properly in browsers.",
      },
      {
        content:
          "🎨 Users can now successfully edit uploaded images instead of having new images generated.",
      },
      {
        content:
          "🌐 Users writing in Persian and Arabic now see properly displayed right-to-left text in the notes section.",
      },
      {
        content:
          "🤖 Users can now successfully @ mention models in Channels instead of experiencing silent failures.",
      },
      {
        content:
          "📋 Users on Windows now see correctly preserved line breaks when using the clipboard variable through CRLF to LF normalization.",
      },
      {
        content:
          "📁 Users now see the Knowledge Selector dropdown correctly displayed above the Create Folder modal instead of being hidden behind it.",
      },
      {
        content:
          "🌅 Users now see profile images in non-PNG formats like SVG, JPEG, and GIF displayed correctly.",
      },
      {
        content:
          "🆕 Non-admin users with disabled temporary chat permissions can now successfully create new chats and use pinned models from the sidebar.",
      },
      {
        content:
          '🎛️ Users can now successfully use workspace models in chat, fixing "Model not found" errors that occurred when using custom model presets.',
      },
      {
        content:
          "🔁 Users can now regenerate messages without crashes when the parent message is missing or corrupted in the chat history.",
      },
      {
        content:
          '✏️ Users no longer experience TipTap rich text editor crashes with "editor view is not available" errors.',
      },
      {
        content:
          "📗 Administrators with bypass access control enabled now correctly have write access to all knowledge bases.",
      },
      {
        content:
          "🔍 Administrators using local CrossEncoder reranking models now see proper relevance threshold behavior through MS MARCO model score normalization.",
      },
      {
        content:
          "🎯 Administrators using local SentenceTransformers embedding engine now benefit from proper batch size settings.",
      },
      {
        content:
          "🔧 Administrators and users in offline mode or restricted environments no longer experience crashes when Tools and Functions have frontmatter requirements.",
      },
      {
        content:
          "📄 Administrators can now properly configure the MinerU document parsing service as the MinerU Cloud API key field is now available in the Admin Panel.",
      },
      {
        content:
          "⚠️ Administrators no longer see SyntaxWarnings for invalid escape sequences in password validation regex patterns.",
      },
      {
        content:
          "🎨 Users with ComfyUI workflows now see only the intended final output images in chat instead of duplicate images from intermediate processing nodes.",
      },
      {
        content:
          "🖼️ Users with image generation enabled no longer see false vision capability warnings.",
      },
      {
        content:
          "🔌 Administrators no longer experience infinite loading screens when invalid or MCP-style configurations are used with OpenAPI connection types.",
      },
      {
        content:
          "📥 Administrators no longer encounter TypeError crashes during SHA256 verification when uploading GGUF models via URL.",
      },
      {
        content:
          "🚦 Users with Brave Search now experience automatic retry with a 1-second delay when hitting rate limits.",
      },
      {
        content:
          "🗄️ Administrators with Redis Sentinel deployments no longer experience crashes during websocket disconnections.",
      },
      {
        content:
          "🔐 Administrators using SCIM group management no longer encounter 500 errors when working with groups that have no members.",
      },
      {
        content:
          "🔗 Users now experience more reliable citations from AI models, especially when using smaller or weaker models.",
      },
      {
        content:
          "🕸️ Administrators can now successfully save WebSearch settings without encountering validation errors.",
      },
      {
        content:
          "📦 Administrators installing with the uv package manager now experience successful installation after deprecated dependencies were removed.",
      },
      {
        content:
          '⏱️ Administrators using custom "AIOHTTP_CLIENT_TIMEOUT" settings now see the configured timeout correctly applied.',
      },
    ],
    changed: [
      {
        content:
          "⚠️ This release includes a major overhaul of database connection handling that requires all instances in multi-worker, multi-server, or load-balanced deployments to be updated simultaneously.",
      },
      {
        content:
          '📝 Administrators who previously used the standalone "Markdown (Header)" text splitter must now switch to "character" or "token" mode with the new toggle enabled.',
      },
      {
        content:
          '🖼️ Users no longer see the "Generate Image" action button in chat message interfaces; custom function should be used.',
      },
      {
        content:
          '🔗 Administrators will find the Admin Evaluations page at the new URL "/admin/evaluations/feedback" instead of "/admin/evaluations/feedbacks".',
      },
      {
        content:
          "🔐 Scripts or integrations that directly called Image Generation, Web Search, or Audio APIs while those features were disabled will now receive 403 errors.",
      },
      {
        content:
          '👥 The default group sharing permission changed from "Members" to "Anyone".',
      },
    ],
  },
};

const API_ROOT =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "https://pleiade.mi.parisdescartes.fr/api/v1").replace(
    /\/api\/v1\/?$/,
    "/api"
  );

const VERSION_UPDATES_ROUTE =
  process.env.EXPO_PUBLIC_ABOUT_UPDATES_ROUTE || "/version/updates";

const OLLAMA_API_ROOT =
  process.env.EXPO_PUBLIC_OLLAMA_API_ROOT || API_ROOT.replace(/\/api\/?$/, "");

const OLLAMA_VERSION_ROUTE =
  process.env.EXPO_PUBLIC_OLLAMA_VERSION_ROUTE || "/ollama/api/version";

function normalizeVersionUpdates(payload: any): AboutVersionUpdates {
  const data =
    payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

  return {
    current: typeof data?.current === "string" ? data.current : "",
    latest: typeof data?.latest === "string" ? data.latest : "",
  };
}

function normalizeOllamaVersion(payload: any): string {
  const data =
    payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

  if (typeof data === "string") return data;
  if (typeof data?.version === "string") return data.version;
  if (typeof data?.ollama?.version === "string") return data.ollama.version;

  return "";
}

export const aboutService = {
  getVersionUpdates: async (): Promise<AboutVersionUpdates> => {
    const response = await apiClient.get(VERSION_UPDATES_ROUTE, {
      baseURL: API_ROOT,
      headers: { "x-no-cache": "1" },
    });

    return normalizeVersionUpdates(response.data);
  },
  getOllamaVersion: async (): Promise<string> => {
    const response = await apiClient.get(OLLAMA_VERSION_ROUTE, {
      baseURL: OLLAMA_API_ROOT,
      headers: { "x-no-cache": "1" },
    });

    return normalizeOllamaVersion(response.data);
  },
  getReleaseNotes: async (): Promise<Record<string, AboutReleaseNotesVersion>> => RELEASE_NOTES,
};
