const AppError = require("../utils/appError");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const parseList = (text) =>
  text
    .split(/\r?\n|,/)
    .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

const createAiService = ({ apiKey, model = "llama-3.3-70b-versatile" }) => {
  const callGroq = async (systemPrompt, userPrompt) => {
    if (!apiKey) {
      throw new AppError("GROQ_API_KEY is not configured", 503);
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new AppError(payload?.error?.message || "Groq request failed", 502);
    }

    return payload.choices?.[0]?.message?.content?.trim() || "";
  };

  // Full Groq chat call that supports tool/function calling and returns the
  // raw assistant message (so callers can inspect tool_calls).
  const callGroqChat = async ({ messages, tools }) => {
    if (!apiKey) {
      throw new AppError("GROQ_API_KEY is not configured", 503);
    }

    const body = { model, messages, temperature: 0.3 };
    if (tools) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new AppError(payload?.error?.message || "Groq request failed", 502);
    }

    return payload.choices?.[0]?.message || {};
  };

  const stripHtml = (value) =>
    String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    async run(action, note, options = {}) {
      const noteText = `Title: ${note.title}\nContent:\n${note.content}`;

      if (action === "title") {
        const title = await callGroq(
          "Create concise note titles. Return only the title.",
          noteText,
        );
        return { title };
      }

      if (action === "summary") {
        const summary = await callGroq(
          "Summarize notes in 2-3 short sentences. Return only the summary.",
          noteText,
        );
        return { summary };
      }

      if (action === "grammar") {
        const corrected = await callGroq(
          "Correct grammar while preserving meaning and formatting. Return only corrected note content.",
          note.content,
        );
        return { corrected };
      }

      if (action === "tags") {
        const tags = await callGroq(
          "Extract at most 3 short, single-word tags. Return a comma-separated list only.",
          noteText,
        );
        return { tags: parseList(tags).slice(0, 3) };
      }

      if (action === "tasks") {
        const tasks = await callGroq(
          "Extract actionable tasks. Return one task per line, without extra commentary.",
          noteText,
        );
        return { tasks: parseList(tasks) };
      }

      if (action === "translate") {
        const targetLanguage = options.targetLanguage || "English";
        const translation = await callGroq(
          `Translate the note to ${targetLanguage}. Return only translated content.`,
          note.content,
        );
        return { translation };
      }

      throw new AppError("Unsupported AI action", 400);
    },

    async chat(notes, message, options = {}) {
      if (!message?.trim()) {
        throw new AppError("message is required", 400);
      }

      const { createNote, updateNote, history = [] } = options;

      const active = notes.filter((note) => !note.isTrashed);
      const stats = {
        total: active.length,
        pinned: active.filter((note) => note.isPinned).length,
        archived: active.filter((note) => note.isArchived).length,
        reminders: active.filter((note) => note.reminderAt).length,
        trashed: notes.filter((note) => note.isTrashed).length,
      };
      const labels = Array.from(
        new Set(notes.flatMap((note) => note.labels || [])),
      );

      const reminderList =
        active
          .filter((note) => note.reminderAt)
          .sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt))
          .map(
            (note) =>
              `- "${note.title}" at ${new Date(note.reminderAt).toLocaleString()}`,
          )
          .join("\n") || "none";

      const overview =
        `The user has ${stats.total} active notes ` +
        `(${stats.pinned} pinned, ${stats.archived} archived, ` +
        `${stats.reminders} with reminders) and ${stats.trashed} in trash. ` +
        `Labels: ${labels.join(", ") || "none"}.`;

      const context =
        notes
          .map((note, index) => {
            const flags = [];
            if (note.isPinned) flags.push("pinned");
            if (note.isArchived) flags.push("archived");
            if (note.isTrashed) flags.push("trashed");
            if (note.reminderAt) {
              flags.push(`reminder ${new Date(note.reminderAt).toLocaleString()}`);
            }
            if (note.labels?.length) flags.push(`labels: ${note.labels.join("/")}`);
            const meta = flags.length ? ` [${flags.join("; ")}]` : "";
            return `[${index + 1}] ${note.title}${meta}\n${stripHtml(note.content)}`;
          })
          .join("\n\n") || "(the user has no notes yet)";

      // Resolve a note by (fuzzy) title, returning a clarification if ambiguous.
      const resolveNote = (query) => {
        const q = (query || "").trim().toLowerCase();
        if (!q) return { error: "Which note do you mean?" };
        const usable = notes.filter((note) => !note.isTrashed);
        const exact = usable.filter(
          (note) => (note.title || "").toLowerCase() === q,
        );
        const matches = exact.length
          ? exact
          : usable.filter((note) =>
              (note.title || "").toLowerCase().includes(q),
            );
        if (matches.length === 0) {
          return { error: `I couldn't find a note called “${query}”.` };
        }
        if (matches.length > 1) {
          return {
            error: `I found a few notes matching “${query}”: ${matches
              .map((note) => note.title)
              .join(", ")}. Which one?`,
          };
        }
        return { note: matches[0] };
      };

      const tools = [];
      if (createNote) {
        tools.push({
          type: "function",
          function: {
            name: "create_note",
            description:
              "Create a new note when the user asks to add/create/make a note.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short note title" },
                content: { type: "string", description: "The note body text" },
              },
              required: ["content"],
            },
          },
        });
      }
      if (updateNote) {
        tools.push(
          {
            type: "function",
            function: {
              name: "set_reminder",
              description: "Set a reminder on an existing note.",
              parameters: {
                type: "object",
                properties: {
                  note_title: {
                    type: "string",
                    description: "Title (or part of it) of the target note",
                  },
                  when: {
                    type: "string",
                    description:
                      "The reminder date/time as an ISO 8601 string, computed from the current time given in the system prompt",
                  },
                },
                required: ["note_title", "when"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "add_label",
              description: "Add a label/tag to an existing note.",
              parameters: {
                type: "object",
                properties: {
                  note_title: {
                    type: "string",
                    description: "Title (or part of it) of the target note",
                  },
                  label: { type: "string", description: "The label to add" },
                },
                required: ["note_title", "label"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "set_archived",
              description: "Archive or unarchive an existing note.",
              parameters: {
                type: "object",
                properties: {
                  note_title: {
                    type: "string",
                    description: "Title (or part of it) of the target note",
                  },
                  archived: {
                    type: "boolean",
                    description: "true to archive, false to unarchive",
                  },
                },
                required: ["note_title", "archived"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "trash_note",
              description:
                "Delete an existing note by moving it to the trash (recoverable).",
              parameters: {
                type: "object",
                properties: {
                  note_title: {
                    type: "string",
                    description: "Title (or part of it) of the target note",
                  },
                },
                required: ["note_title"],
              },
            },
          },
        );
      }

      const executeToolCall = async (call) => {
        const name = call.function?.name;
        let args = {};
        try {
          args = JSON.parse(call.function?.arguments || "{}");
        } catch {
          args = {};
        }

        if (name === "create_note" && createNote) {
          const content = (args.content || "").trim();
          if (!content) return { text: "What should the note say?" };
          const note = await createNote({
            title: (args.title || "").trim() || "Untitled",
            content,
          });
          return { text: `Created a note titled “${note.title}”.`, changed: true };
        }

        if (name === "set_reminder" && updateNote) {
          const { note, error } = resolveNote(args.note_title);
          if (error) return { text: error };
          if (!args.when) return { text: "When should I remind you?" };
          await updateNote(note.id, { reminderAt: args.when });
          return {
            text: `Set a reminder on “${note.title}” for ${new Date(
              args.when,
            ).toLocaleString()}.`,
            changed: true,
          };
        }

        if (name === "add_label" && updateNote) {
          const { note, error } = resolveNote(args.note_title);
          if (error) return { text: error };
          const label = (args.label || "").trim();
          if (!label) return { text: "What label should I add?" };
          const nextLabels = Array.from(
            new Set([...(note.labels || []), label]),
          );
          await updateNote(note.id, { labels: nextLabels });
          return {
            text: `Added the label “${label}” to “${note.title}”.`,
            changed: true,
          };
        }

        if (name === "set_archived" && updateNote) {
          const { note, error } = resolveNote(args.note_title);
          if (error) return { text: error };
          const archived = args.archived !== false;
          await updateNote(note.id, { isArchived: archived });
          return {
            text: `${archived ? "Archived" : "Unarchived"} “${note.title}”.`,
            changed: true,
          };
        }

        if (name === "trash_note" && updateNote) {
          const { note, error } = resolveNote(args.note_title);
          if (error) return { text: error };
          await updateNote(note.id, { isTrashed: true });
          return {
            text: `Moved “${note.title}” to trash. You can restore it from the Trash view.`,
            changed: true,
          };
        }

        return { text: "" };
      };

      const historyMessages = (Array.isArray(history) ? history : [])
        .filter(
          (entry) =>
            (entry?.role === "user" || entry?.role === "assistant") &&
            entry?.text,
        )
        .slice(-10)
        .map((entry) => ({ role: entry.role, content: entry.text }));

      const messages = [
        {
          role: "system",
          content:
            `You are Jotter's assistant. The current date and time is ${new Date().toString()}. ` +
            "Answer questions about the user's notes, including counts and stats " +
            "(total, pinned, archived, reminders, labels) using the OVERVIEW and NOTES. " +
            "Use the tools to create notes, set reminders, add labels, archive/unarchive, " +
            "or delete (move to trash) when the user asks. Identify target notes by their " +
            "title. Be concise.",
        },
        ...historyMessages,
        {
          role: "user",
          content: `OVERVIEW: ${overview}\n\nREMINDERS:\n${reminderList}\n\nNOTES:\n${context}\n\nUSER: ${message}`,
        },
      ];

      const reply = await callGroqChat({
        messages,
        tools: tools.length ? tools : undefined,
      });
      const toolCalls = reply.tool_calls || [];

      if (toolCalls.length > 0) {
        const results = [];
        let changed = false;
        for (const call of toolCalls) {
          const result = await executeToolCall(call);
          if (result.text) results.push(result.text);
          if (result.changed) changed = true;
        }
        return {
          answer: results.join(" ") || "Done.",
          ...(changed ? { action: "notes_changed" } : {}),
        };
      }

      return { answer: reply.content?.trim() || "" };
    },
  };
};

module.exports = {
  createAiService,
};
