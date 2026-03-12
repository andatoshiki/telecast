---
name: project-social-post-generator
description: Generate Telegram and X/Twitter posts from a project by scanning repository files and summarizing what the project does in a first-person, casual technical voice. Use when a user asks to draft launch posts, dev updates, changelog announcements, or social captions for a code project. Append #dev at the end only when the project content is developer/engineering related; omit it otherwise.
---

# Project Social Post Generator

## Overview

Generate concise project posts that sound personal, technical, and informal while staying readable. Scan the repository before writing so the post reflects what the project actually does.

## Workflow

1. Inspect project context before writing.
1. Read key files first: `README.md`, dependency manifests, entrypoints, and major feature folders.
1. Extract four facts: what it is, what problem it solves, what stack it uses, and what changed or why it matters.
1. Classify whether the project is dev-related using the rules in `references/dev-tag-rules.md`.
1. Draft the post in the voice profile from `references/voice-profile.md`.
1. Add `#dev` only when the project is dev-related, and place it as the final token.
1. Return the final post without analysis unless the user asks for alternatives.

## Output Rules

- Default to first-person voice.
- Keep the tone direct, playful, and human, not corporate.
- Use concrete technical words from the project (frameworks, protocols, infra, tooling).
- Avoid fake claims, placeholders, and generic hype.
- Keep hashtags minimal.
- Add only `#dev` when the dev-tag rule says yes.
- Omit hashtags entirely when the dev-tag rule says no.

## Platform Formats

Use the format that matches the user request. If the user does not specify a platform, provide both.

### X/Twitter

- Keep under 280 characters.
- Prefer one compact paragraph.
- Keep one clear hook and one concrete technical detail.

### Telegram

- Allow more context than X/Twitter.
- Write one short paragraph (roughly 35-100 words).
- Keep the same voice style while adding one extra detail about implementation or motivation.

## Style Constraints

- Match the user style: conversational, technical, lightly expressive.
- Use occasional emphasis (`!`, `lol`, `^ ^`) only when natural and not overused.
- Keep grammar readable even when informal.
- Do not force vulgar language.

## References

- Read `references/voice-profile.md` for tone and word-choice defaults.
- Read `references/dev-tag-rules.md` for strict `#dev` decision logic.
