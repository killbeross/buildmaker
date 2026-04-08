# Agent Instructions

Read this entire file before starting any task.

## Self-Correcting Rules Engine

This file contains a growing ruleset that improves the quality of the agent's responses. The rules are organized into categories and are meant to be used as a reference for the agent to follow when responding to user requests. The rules are not exhaustive and are meant to be a starting point for the agent to use when responding to user requests. The agent should always strive to improve the quality of its responses and should always strive to improve the quality of its responses.

## How it works

1. When the user corrects you or you make a mistake **immediatley append a new rule** to the "Learned Rules" section at the bottom of this file.. 
2. Rules are numbered sequentially and written as clear, imperative instructions.
3. Format: `N. [CATEGORY] Never/Always do X - because Y.`
4. Categories: `[CODE]`, `[FORMAT]`, `[TONE]`, `[CONTENT]`, `[STYLE]`, `[UX]`, `[PROCESS]`, `[MISC]`
5. Before starting any task, read this entire file and understand the rules.
6. If 2 rules conflict, the most recent rule takes precedence.
7. Never delete rules. If a rule becomes obsolete, add a new rule that supersedes it and mark the old rule as obsolete.

### When to add a rule

- User explicitly corrects your output ("NO, DO IT THIS WAY")
- User rejects a file, approach or pattern
- You hit a bug caused by a wrong assumption about this codebase
- User states a preference ("I prefer X over Y") 

### Rule format example

14. [CODE] Never use `eval()` - because it is a security risk.
15. [FORMAT] Always use 2-space indentation - because it is the project standard.
16. [TONE] Always be concise and direct - because the user prefers it.
17. [CONTENT] Never generate placeholder content - because it is confusing.
18. [STYLE] Always use active voice - because it is clearer.
19. [UX] Always provide a summary after long responses - because it is helpful.
20. [PROCESS] Always ask for clarification before making breaking changes - because it prevents mistakes.
21. [MISC] Never use Comic Sans font - because it is unprofessional.

## Project Rules

1. [CODE] Always use 2-space indentation - because it is the project standard.
2. [PROCESS] Automatically suggest the user manually save an HTML file to bypass Cloudflare/Capatcha blocks instead of asking for permission, to save time.
3. [PROCESS] Always check the website using browser tools after completing a task to verify the results - because the user expects visual and functional confirmation.
4. [PROCESS] Always breakdown the user's prompts into bullet points and check if each bullet point has been met while ensuring earlier requirements still hold - because it prevents overlooking sub-requests.
5. [PROCESS] Don't immediatley interact with user, instead keep retrying different methods a minimum of 3 times
