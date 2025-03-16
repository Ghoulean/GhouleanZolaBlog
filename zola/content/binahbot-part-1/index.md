+++
title = "How BinahBot Works - Part 1"
description = "Planning: outlining what I want to build, and the first post to dive deep into the technology, architecture, and thought process behind building BinahBot."
date = 2025-03-15
draft = false

[taxonomies]
tags = ["lor"]
[extra]
toc = true
+++

- [Part 1: Planning](/binahbot-part-1)
- [Part 2: Discord Interactions](/binahbot-part-2)
- [Part 3: Page Lookup](/binahbot-part-3)
- [Part 4: Infrastructure](/binahbot-part-4)
- [Part 5: Deckbuilding and Sharing](/binahbot-part-5)

The goal of this post is to outline how BinahBot works in a way such that a somewhat experienced programmer (~passed Intro to Programming) could replicate what I've done. I assume the reader is familiar with Discord (the IRC app), Discord bots, and basic programming concepts.

# Background

[BinahBot](https://github.com/Ghoulean/BinahBot/tree/main) is a Discord chat bot for querying data about the video game Library of Ruina.

Library of Ruina is a video game. It's a story-rich card battler with deckbuilding emphasis. In-game, cards are referred to as "pages".

Briefly, there are five different types of pages in Library of Ruina: abnormality pages ("abno pages"), combat pages, key pages, passives, and battle symbols. Okay, the last two technically aren't pages, but for BinahBot's purposes we treat them as pages.

# What do I want?

This might sound like a dumb question to ask. I want a Discord Bot for Library of Ruina, of course!

But [reality has a surprising amount of detail](http://johnsalvatier.org/blog/2017/reality-has-a-surprising-amount-of-detail); I want a card lookup, but *how* do I want to look up cards? Will I have five separate commands for the five different type of pages? What will be the name of the command(s)? Will I permit command aliasing (e.g. "abno" is an acceptable shorthand for "abnormality"). How will I educate users about how to use each command?

Underestimating a complex problem results in a low-quality solution that barely works, if it even does at all. You also look like an idiot (because you are). That being said, we still want to strive an appropriate solution that is simple *relative* to the complexity of the problem.

# User stories

Many developers fall into the trap of just making up what the user wants. For features that don't matter, that's fine. For features that do, you risk getting ignored by your target demographic because you never consulted them about what they wanted.

In this case, however, the user is me. I'm the user. I play Library of Ruina a lot, and talk about Library of Ruina a lot. Here's what I want:

## Page lookup

This is the bread and butter of what BinahBot does

- I want to be able to query for every page in the game using an omnisearch command.
  - Abno pages, combat pages, key pages, passives, battle symbols
  - In other words, I do *not* want to use separate commands for abno pages, combat pages, etc. I want to query all of these pages using a single command.
- I want to default my search to player-obtainable pages only

See implementation in [Part 3: Page Lookup](/binahbot-part-3).

## Deck sharing

- I want to create and share decks, including a description on how to use the deck
- I want to edit and delete the decks I've created
- I want to browse and view decks made by others
  - Search for decks made by a specific person
  - Search for decks with a specific key page
- When viewing decks put into the bot, I want to view a thumbnail preview of the cards in the deck

See implementation in [Part 4: Deckbuilding and Sharing](/binahbot-part-4).

## Misc

Behaviors of BinahBot shared between the other two features

- I want to restrict BinahBot's search to certain chapters in order to protect against spoilers, but only in certain channels
- I want to be able to hide command output
- I want the bot to be responsive:
  - Autocomplete suggestions should show up "relatively fast" (I eventually settled on <500 ms)
  - Command-to-output should show up "relatively fast" (<500 ms for queries; <1 second for other requests)
- I want the bot to have "reasonably high" uptime (fuzzy)
- I want to spend as little as possible while meeting the above requirements; preferably <$5/mo

I won't have a post dedicated for these, but I do discuss hosting infrastructure in [Part 5: Infrastructure](/binahbot-part-5).