---
name: git-committer
description: Use whenever drafting a git commit message in this repo. Formats commit messages per the Conventional Commits v1.0.0 specification (type(scope)!: subject, body, footer). Invoke before running `git commit`.
---

# git-committer

Formats commit messages to the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) spec. This governs message *formatting* only — whether to commit at all, what to stage, and the `Co-Authored-By` trailer are governed by the standing git instructions already in context; don't relax those.

## Structure

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Header

- `type`: one of
  - `feat` — new feature (user-facing)
  - `fix` — bug fix
  - `docs` — documentation only
  - `style` — formatting, whitespace, no code meaning change
  - `refactor` — code change that neither fixes a bug nor adds a feature
  - `perf` — performance improvement
  - `test` — adding or correcting tests
  - `build` — build system or external dependencies
  - `ci` — CI configuration/scripts
  - `chore` — everything else (tooling, maintenance)
  - `revert` — reverts a previous commit
- `scope` (optional): a noun in parentheses naming the affected area, e.g. `feat(auth):`, `fix(parser):`. Omit if the change is broad or scope isn't meaningful.
- `!` (optional): immediately before the `:`, marks a breaking change, e.g. `feat(api)!:`. Must also be documented in a `BREAKING CHANGE:` footer.
- `description`: imperative mood ("add", not "added"/"adds"), lowercase first letter, no trailing period, concise enough to read as a one-line summary. Aim for ≤72 characters total on the header line.

## Body (optional)

- Blank line after the header, then free-form paragraphs.
- Explain *why*, not what the diff already shows — motivation, prior behavior, tradeoffs.
- Wrap at ~72 characters per line.

## Footer (optional)

- Blank line before footers.
- One footer per line, format `Token: value` or `Token #value`, e.g.:
  - `BREAKING CHANGE: <description of the break and migration path>` (note the space after `BREAKING CHANGE:`, unlike other tokens which use `-` for multi-word tokens, e.g. `Reviewed-by:`)
  - `Fixes #123`, `Closes #123`, `Refs #123`
- `Co-Authored-By:` trailers (when required by the standing git commit instructions) go last, after any other footers.

## Examples

```
fix(cache): evict expired entries before size check

Previously the size check ran first, so an entry could be counted
against the limit for one extra cycle after expiring. Evicting first
keeps the reported size accurate.

Fixes #482
```

```
feat(api)!: require explicit content-type on upload endpoint

BREAKING CHANGE: requests without a Content-Type header now return
415 instead of defaulting to application/octet-stream. Callers must
set the header explicitly.
```

```
chore: bump lockfile for transitive dep security patch
```

## Choosing the type when it's ambiguous

- Bug fix that also happens to refactor nearby code → `fix`, not `refactor` (the user-visible effect wins).
- New test coverage for existing behavior, no production code change → `test`.
- Dependency bump alone → `build` if it affects the build/release pipeline, else `chore`.
- If a change reasonably spans multiple types, split into separate commits rather than picking one type and stretching it.
