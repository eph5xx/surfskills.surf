# Copy rules

How the text in `card.json` should read. The rules come from the live cards on surfskills.surf; `card-check.mjs` enforces the mechanical ones.

## Voice

- **Outcome first.** Lead with what the reader gets, not how the skill works inside.
- **Concrete.** A real number or artifact ("33 documented patterns", "a 1920×1080, 10-second intro", "a scored report") beats an adjective.
- **Second person, present tense.** Talk to the reader about what the skill does now.
- **Honest.** Every claim must come from `skill/` (or, for the collection, the README). Don't promise what the files don't support. If a step needs an API key, say it is optional only if the files say so.
- **Plain.** No preamble, no hype. Never write "This skill allows you to…".

## The page

The skill page shows, in order: `name` as the title, `short_description` under it, the demo video, then "What it does" (`long_description`), "When to use it" (`when_to_use`) and "FAQ" (`faq`). Every field is printed as plain text, so markdown shows up as stray symbols.

## Fields

| Field | Rule |
| --- | --- |
| `name` | An outcome in Title Case, 8–40 characters: "Humanize AI Writing", "Map Any Codebase", "Turn a PR Into a Video". Not the slug. It must not match a name `card-facts` lists as taken. |
| `short_description` | 100–200 characters, one or two sentences. The single most compelling outcome. It also appears on the Discover card. |
| `long_description` | 400–1200 characters of plain text in 2–3 paragraphs, separated by one blank line (`\n\n`), with no line breaks inside a paragraph. No markdown: no `**`, `#`, lists, links or backticks. The first paragraph says what you give it and what you get back. The others say how it gets there and what makes it different. |
| first sentence | The page's meta description is the first sentence of `long_description` (up to the first `.`, `!` or `?` followed by a space). It must stand on its own and be at least 40 characters. |
| `when_to_use` | 3–4 items. Each `title` is a situation the reader is in ("Your draft reads like a chatbot wrote it", "You need slides that don't look generic"), up to 70 characters. Each `body` is one sentence on what the skill does for them there, up to 240 characters. No two titles alike. |
| `faq` | 3–4 items. Each `q` is a question a buyer would ask, up to 90 characters, ending in `?`. Each `a` answers it directly in up to 400 characters, starting with "Yes.", "No." or the fact. Answers name the skill ("Humanizer keeps your meaning…"); at least one must. Cover what makes it different, what it needs (keys, tools, accounts), and what you get. |
| `kind`, `use_cases` | See [classify.md](classify.md). |

Banned anywhere: delve, tapestry, testament, seamless, leverage, unlock, unleash, elevate, empower, supercharge, game-changer, revolutionize, cutting-edge, state-of-the-art, effortless, harness, streamline, robust, powerful, "dive into", "look no further", "whether you're", "this skill allows" / "this skill helps", and placeholders (TODO, TBD, FIXME, FILL, lorem). Dashes are allowed.

## The collection

Only when `card-facts` says the repo is not on the site. The collection page introduces the whole repo, not this one skill. Same rules as above, with these differences:

| Field | Rule |
| --- | --- |
| `collection.name` | The project's own name, as the README's title calls it ("Humanizer", "HyperFrames", "Superpowers"), cleaned of badges and emoji, up to 60 characters. Not an outcome. |
| `collection.short_description` | 100–200 characters: what the project is and what you get from it. |
| `collection.long_description` | 400–1200 characters, 2–3 plain paragraphs: what it is, what's in it (how many skills, which agents it works with), and what sets it apart. |
| `collection.when_to_use` | 2–4 items, same shape as the skill's. |
| `collection.faq` | 3–4 items, same shape. Good questions: how to install it, which agents it works with, whether it's free, what it needs. |

## Worked example

The live Humanizer card (blader/humanizer/humanizer). It quotes three banned words as examples of AI tells; `card-check` would reject them, so don't quote banned words even as examples.

```json
{
  "name": "Humanize AI Writing",
  "short_description": "Humanize AI writing: paste text that reads like a chatbot wrote it and get back a natural version with the same meaning and length, minus the AI tells.",
  "long_description": "Paste text that reads like a chatbot wrote it and get back a version that sounds human. The meaning stays, the paragraph count stays, and the tells that give AI away are gone: em dash pileups, the rule of three, inflated significance, and stock words like \"delve,\" \"tapestry,\" and \"testament.\"\n\nIt checks your writing against 33 documented patterns from Wikipedia's \"Signs of AI writing\" guide, drafts a rewrite, then audits that draft a second time to catch anything it missed before handing back a final version with zero em or en dashes. Give it a sample of your own writing and it matches your rhythm and word choices instead of settling for generic clean prose.",
  "when_to_use": [
    {
      "title": "Your draft reads like a chatbot wrote it",
      "body": "Paste it and get the same points back in plain, human language, with tells like em dashes and the rule of three taken out."
    },
    {
      "title": "You're about to publish and the copy feels generic",
      "body": "Clean out promotional filler, hedging, and stock AI phrases before the piece goes live, without changing what it says."
    },
    {
      "title": "You want the rewrite to sound like you",
      "body": "Give it a sample of your own writing and it matches your rhythm and word choice instead of flattening everything to one voice."
    }
  ],
  "faq": [
    {
      "q": "Will it change what I meant?",
      "a": "No. Humanizer rewrites rather than deletes, so it keeps your meaning and your original length. A five-paragraph draft comes back as five paragraphs, with AI phrasings swapped for natural ones and nothing you said dropped."
    },
    {
      "q": "Will it still sound like me?",
      "a": "Yes, if you want it to. Humanizer treats flat, voiceless prose as its own AI tell, and you can paste a sample of your own writing so the rewrite matches your rhythm and word choices instead of a default style."
    },
    {
      "q": "How is this different from asking a chatbot to fix it?",
      "a": "Humanizer works from 33 documented patterns in Wikipedia's Signs of AI writing guide, not a vague ask. It drafts, audits that draft for tells it missed, then strips every em and en dash before handing the text back."
    },
    {
      "q": "Does it work on formal or work writing?",
      "a": "Yes. Humanizer matches the tone of the input, so technical, legal, and reference text stays neutral and plain instead of getting opinions bolted on. It only adds personality when the writing calls for it."
    }
  ],
  "kind": "Action",
  "use_cases": ["Writing"]
}
```
