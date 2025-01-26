+++
title = "How BinahBot Works"
description = "A deep dive into the technology behind a Discord bot"
date = 2025-01-25
draft = true

[taxonomies]
tags = ["lor"]
[extra]
toc = true
+++

The goal of this post is to outline how BinahBot works in a way such that an experienced programmer could replicate what I've done. I assume the reader is familiar with the concept of Discord, Discord bots, and basic programming concepts.

# Background

Discord is a popular instant messaging-based social media platform where communications primarily take place in virtual communities ("servers") or in direct correspondance.

A Discord bot is a program that connects to Discord and performs various automated tasks.

BinahBot is a Discord bot for querying data about the video game Library of Ruina.

Library of Ruina is a story-rich card battler with deckbuilding emphasis. In-game, cards are referred to as "pages".

Briefly, there are five different types of pages in Library of Ruina: abnormality pages ("abno pages"), combat pages, key pages, passives, and battle symbols. Okay, the last two technically aren't pages, and all five are drastically different in functionality, but for BinahBot's purposes we treat them as pages.

# Features

Here's a quick list of features that I knew I wanted BinahBot to have when I set out to build it:

- As a user, I want to be able to query for every page in the game using an omnisearch command.
  - Abno pages, combat pages, key pages, passives, battle symbols
  - In other words, I do *not* want to use separate commands for abno pages, combat pages, etc. I want to query all of these pages using a single command.
- As a user, I want to default my search to player-obtainable pages only
- As a user, I want to create and share decks, including a description on how to use the deck
- As a user, I want to edit and delete the decks I've created
- As a user, I want to browse and view decks made by others
  - Search for decks made by a specific person
  - Search for decks with a specific key page
- As a server administrator, I want to restrict BinahBot's search to certain chapters in order to protect against spoilers
- As a user, I want the bot to be responsive:
  - Autocomplete suggestions should show up "relatively fast" (I eventually settled on <500 ms)
  - Command-to-output should show up "relatively fast" (<500 ms for queries; <1 second for other requests)

# Getting the Data

Obtaining the data is mostly straightforwards. A mod on Steam Workshop known as "BaseMod Nightly" automatically extracts the raw game data as XML files into its mod folder on loading the game, but only for the locale that's loaded. Library of Ruina supports 5 locales: English, Korean, Japanese, Chinese (simplified), and Chinese (traditional). You need to load the game 5 times, once in each locale, to extract all 5 XMLs.

{{ img(src="basemod.png" class="ci b1") }}

Parsing the data is also mostly straightforward. For example, combat page's models generally resembles what combat pages look like in game: they have a name, cart art, card effect (optional), dice, dice rolls, dice effects (optional), etc. Ruina seems to implicitly use a decent amount of default values (for example, missing die type ("Detail") defaults to Slash dice), but outside of that hiccup (which can be solved through trial-and-error), parsing the XMLs is a fairly straightforwards, if not tedious, task.

# Querying the data

Ideally, the user would search up a card (say, "Weight of Sin"), and BinahBot would dutifully provide that card to the user.

{{ img(src="binahbot_query.png" class="ci") }}

It's a lot harder than it sounds.

Firstly, BinahBot doesn't *just* support player-obtainable pages. It supports enemy-side pages also. While most of the player-obtainable pages are rather clean, the same cannot be said about enemy-side pages. Project Moon often shuffles around effects among boss passives such that the enemy *seems* to be getting a certain effect from a certain passive, even though the organization is all over the place. As a result, querying for a specific enemyside-only page can prove extremely challenging.

For example, "Shimmering" is a common passive on boss enemies which states:

 > At the start of each Scene, exhaust all pages in hand and deck; add new pages to hand. Their Cost becomes 0.

Library of Ruina has [**41** different Shimmering passives](https://tiphereth.zasz.su/passives/?qn=shimmering). How would the user manage to differentiate them all? How would the user even recognize that this is what's actually in the game, and not a bug?

It may be tempting to restrict BinahBot's support to only playerside pages, but sometimes name collisions still occur, such as with Electric Shock and Prepared Mind:

{{ img(src="collisions.png" class="ci") }}

And lastly there's a whole plethora of various pages that don't have a name at all. For example, [page 607101](https://tiphereth.zasz.su/cards/607101/) seems strange at first glance and appears to be an unused test page. In actuality, this page is used by the player-obtainable passive [Retaliate](https://tiphereth.zasz.su/passives/250222/).

In summary, BinahBot needs a way to query for pages in five different languages, where pages may contain name collisions and/or have no name.

## Disambiguations

In order to differentiate these cards, I add an annotation to each name. These annotations were inspired by Wikipedia pages; when I look up something with a name collision, Wikipedia adds disambiguation text to the article:

{{ img(src="disambiguation.png" class="ci") }}

Most of the annotations were added programatically. Cards with a name collision that were uniquely collectable, or obtainable, or a passive, etc. were denoted as such. This covered a lot of cases, such as Electric Shock (combat page) and Electric Shock (passive), but still left many edge cases unaddressed, such as Xiao's enemyside key pages (her appearance at Liu Section I, at Xiao phase 1, and again at Xiao phase 2).

For those edge cases, I manually create and map the disambiguations. It's as painful as it sounds. Covering the playerside-only was fast and easy, but I've procrastinated on and continue to procrastinate on disambiguating the rest. For now I've merely added mappings for "common queries," which I loosely define by queries that cause people to ping me because they think there's some kind of bug (and technically, there is).

As for the nameless pages, I've deliberately excluded nameless pages without a disambiguation. So the unnamed enemyside abnormality pages are queryable, but pages like Retaliate is not.

## Lookup tables

Now that we can uniquely identify each entry, let's perform a lookup.

The naive way to do a lookup is to take our input string and compare it against every valid name in our little page database. The closest matches, while perhaps excluding things such as special characters, would rank highest in our search list.

The naive way to implement this would be with using [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance). Unfortunately, Levenshtein distance is *slow*: the runtime of Levenshtein comparing two strings of length `n` is `O(n^2)`...and because we cannot precompute anything except a handful of hardcoded queries, we have to run Levenshtein against all ~3,400 entries in our page database for every query. This is a small dataset, and the average experimental delay doesn't pass my personal bar for quality.

I set up a [quick and dirty benchmark test](https://github.com/Ghoulean/BinahBot/blob/acb811dbc1afcaf16a2e2f1dff2632f64def9520/rust/ruina/ruina_index/src/lib.rs#L214-L223) which runs a lookup against every page in the game:

```bash
$ hyperfine 'cargo test --package ruina_index --lib -- tests::benchmark_load --exact --show-output --ignored'
Benchmark 1: cargo test --package ruina_index --lib -- tests::benchmark_load --exact --show-output --ignored
  Time (mean ± σ):     142.2 ms ±   3.3 ms    [User: 85.1 ms, System: 57.8 ms]
  Range (min … max):   137.7 ms … 153.7 ms    20 runs
 
$ hyperfine 'cargo test --package ruina_index --lib -- tests::benchmark_levenshtein --exact --show-output --ignored'
Benchmark 1: cargo test --package ruina_index --lib -- tests::benchmark_levenshtein --exact --show-output --ignored
  Time (mean ± σ):     142.966 s ±  0.878 s    [User: 142.891 s, System: 0.062 s]
  Range (min … max):   142.219 s … 145.305 s    10 runs
```

The setup time is negligable; on average running this test takes over two minutes.

I set off to explore lookups that can quickly generate high-quality lookups even in languages other than English. Two that caught my interest was full-text search and n-gram fuzzy search.

Full-text search is the indexing technique for searching for text in a collection of documents (in this case, pages) which attempts to search based on words rather than text. As an example, querying for "movies release" turn up results that contain the word "release**d**" as in "released in 2009". This is the search algorithm that Wikipedia uses under-the-hood, albeit much more sophisticated than the implementation I went with.

{{ img(src="movies_released.png" class="ci") }}

I followed [this wonderful blog post by Artem Krylysov](https://artem.krylysov.com/blog/2020/07/28/lets-build-a-full-text-search-engine/) and re-implemented the rudimentary algorithm in Rust. In short, here's how the algorithm worked:

1. Take the name of every page we want to index on
2. Remove special characters and common words (such as "the", "a", and "an")
3. For each word in the page's name, reduce it to simply the root word. For example, "punishing bird" became "punish bird"
4. Produce an inverted index based on these roots. In the example above, "punish" would map to pages such as "Punishing Bird" and Punishment, and "bird" would map to pages such as "Punishing Bird", "Judgement Bird", and "Big Bird"
5. When querying for a page, re-do steps 2 and 3 on the query text, generating a list of roots
6. Use the inverted index to find the page(s) with the greatest overlap over all query roots

This was performant in practice, but unfortunately after trialing full-text search or a few weeks I abandoned this approach. The quality of results tend to be poor. Because the size of the "documents" (pages) were often one or two words at most, the vast majority of queries couldn't match to the expected page due to lack of information on each page. Even with exact matches, such as "Clean", this would overlap with pages that contained that word in its entirety, such as "Clean Up". But more critically, full-text search failed spectacularly against typos and partial searches. A user would search with a partial term such as "degra", expecting pages such as "Degraded Pillar", but would instead be met with zero results. "Degra" isn't a word, therefore the algorithm couldn't produce a suitable root.

In my effort to introduce fuzzy search into full-text search, I stumbled upon using n-gram fuzzy search directly via [this blog post by M31 Coding](https://www.m31coding.com/blog/fuzzy-search.html). In short, n-gram search breaks up a query into words, but then further breaks up a word into its individual letters of size `n`. These `n`-sized groups of individual letters are called n-grams. We then map each page to a set of n-grams, and then produce an inverted index mapping the n-grams back to the pages. To perform a query, we break the query string into n-grams using the same process we use to generate the index, and then find the combat page with the greatest overlap.

I re-implemented M31 Coding's n-gram algorithm, alongside most of their tweaks, in Rust into BinahBot. Anecdotally the results are returned quickly and are of high quality, so I'm currently satisfied with staying with this approach.

Below are the results of a [quick and dirty benchmark test](https://github.com/Ghoulean/BinahBot/blob/acb811dbc1afcaf16a2e2f1dff2632f64def9520/rust/ruina/ruina_index/src/lib.rs#L205-L212) which, like the first test, runs a lookup against every page in the game. Due to our inverse index precomputations, we see roughly a x25 performance increase.

```bash
$ hyperfine 'cargo test --package ruina_index --lib -- tests::benchmark_query --exact --show-output --ignored'
Benchmark 1: cargo test --package ruina_index --lib -- tests::benchmark_query --exact --show-output --ignored
  Time (mean ± σ):      5.215 s ±  0.025 s    [User: 5.143 s, System: 0.072 s]
  Range (min … max):    5.189 s …  5.267 s    10 runs
```

# Infrastructure

Now that we got most of the core functionality down, let's talk about bot hosting solutions. I had two fuzzy goals in mind: keep "reasonably high" uptime while minimizing costs.

The uptime requirement practically forces me to use a cloud computing platform as a host because I don't trust my home internet to not die randomly in the middle of the night while I sleep. I picked AWS as my compute platform because I work at Amazon so I'm familiar with their offerings. Also I'm biased. I've briefly considered using not-AWS as a hosting option, and I've concluded that it wasn't worth my time or energy to compare them.

Requests were likely to be low-volume and sporadically distributed. I estimated that each request to the Discord bot would take half a second at most with the majority of the time consumed by network latency. Although I wanted to minimize latency, ideally <100 ms, I had no hard requirement here; I could accept if this was relaxed.

Thus, I host the bot on AWS Lambda fronted by AWS API Gateway. See the Appendix for a discussion on cloud compute options. For storage, I use AWS S3 for image storage (page art, etc), AWS DynamoDB for my key-value storage needs, and AWS Secrets Manager for holding secrets that I need to access during runtime.

I separate the thumbnail-making functionality to a separate Lambda because the operation takes ~850 ms in the worst case scenario. This wasn't part of the original planned infrastructure; I underestimated the latency of image creation and write.

The full infrastructure looks something like this:

{{ img(src="infra.png" class="ci") }}

# Discord Interactions

Traditionally, Discord bots have simply been regular Discord users but as a computer program. A lot of very popular bots still use this model. These bots would log onto Discord, then monitor all messages in all channels that they had access in all servers they were a part of, in addition to server edits such as editing roles and emojis. Whenever the bot would feel like it (for example, if someone posted a message with the text "/help"), the bot could post its own message in the corresponding channel. These bots could even read and respond to DMs sent to them.

In 2020, Discord introduced slash commands for bots, which offered a completely a new interaction pattern (aptly named Interactions) that only bots could access. Unlike "traditional bots", who read and choose to ignore the vast majority of messages that they receive, these "interaction bots" do not receive any data about any server activity that does not directly pertain to them. This new model provides immediately appreciable advantages in terms of privacy, compute requirements, and network bandwidth.

Anyways, with Interactions, we expose a URL which acts as an API endpoint to our Discord bot. Discord makes an API request to this endpoint with a message payload and expects a payload in very specific shape within 3 seconds as a response. 

## Request

There are many types of request payloads that Discord sends, but BinahBot responds to primarily three types: ping, new slash command, and button press.

- Ping messages are mandatory to respond; else, Discord assumes your bot is offline. Responding with a "pong" message suffices.
- New slash command messages are sent when a Discord user uses a new slash command. the bot can respond with any message. BinahBot puts its messages in a modal because I think it looks nice.
- Button press messages are sent when a Discord user clicks on a button attached to a modal that BinahBot sent previously. This payload contains information about both the original message and the button that was clicked. In response, BinahBot either edits or deletes the original message.

In all interactions, BinahBot must cryptographically verify the message in order to ensure that the message it received was sent by Discord and not someone pretending to be Discord. In short, Discord signs their messages using a private key generated at bot creation, and we verify this using our public key. Discord offers code samples in Javascript and Python for this verification; I simply translated that to Rust. 

You can check the full documentation for Discord Interactions [here](https://discord.com/developers/docs/interactions/overview).

## Response

For new slash command and button press, BinahBot responds with a Discord embed. An embed is a multimedia component within a message that integrates content from one site to another. In other words, it's the things that looks like this:

{{ img(src="embed.png" class="ci") }}

Internally, it's a [blob of data](https://discord.com/developers/docs/resources/message#embed-object). BinahBot takes advantage of the "fields" field, which URL embeds generally don't use. Each "field" creates a header and description.

Mentally converting the blob of data to its visual representation and back is difficult. During development I used [message.style](https://message.style/) to help visualize what the embeds should look like. As an aside, I dislike that this tool only supports darkmode because darkmode hurts my eyes; I get cross-eyed, develop a headache, and get image "burn-in" if I read darkmode layouts for too long. People keep trying to convince me it's actually the other way around, and it's lightmode that's supposed to hurt my eyes, but I disagree.

{{ img(src="embed_visualizer.png" class="ci") }}

I'd like to call out that beyond what we put in our blob of data, we pretty much have no control over the layout. Usually Discord puts 3 fields to a row on widescreen monitors, but sometimes it decides to put 2 or 1 instead for some reason. Discord has some client-side logic internally to determine how many fields to put to a row depending on screen width (presumably), but I've tested this a bit and beyond screen width I can't figure out any deeper logic than that. For the Ruina pages, this generally hasn't been a problem. Embeds with a lot of text on it, however, just seems to linebreak whenever it wants.

{{ img(src="screen_width.png" class="ci") }}

There's another weirdness that embeds have. Officially, embeds support exactly one image. However, they have an undocumented feature where you can "merge" multiple embeds together to create one embed with multiple images. All embeds must share the same URL field, and viola!

{{ img(src="discord_multi_image_embed.png" class="ci") }}

Unfortunately, the behavior only seems to support up to 4 images. I originally wanted to use this undocumented feature to avoid generating my own deck thumbnails, but the latter is unavoidable. Also, relying on undocumented features is dangerous in general.

## Downstreams

For `/lor`, BinahBot only uses the data that it's pre-extracted to perform the query. For `/createdeck` and other related commands, we need to call additional downstreams.

Here's the flow:

1. User calls `/createdeck` and inputs a deck URL built from Tiphereth's deck editor
  - Example: [Nikolai build](https://tiphereth.zasz.su/u/decks/CS-iR8cs_8_nUNrE-G0Yi7/)
2. BinahBot receives the request, and calls Tiphereth to convert the deck URL into deck data
3. Simultaneously,
  - BinahBot saves the deck data into DynamoDB, taking note of the deck name, author, and keypage as indices
  - BinahBot asynchronously fires-and-forgets a call to the thumbnail Lambda, which (hopefully) generates a thumbnail for the deck (that saves to S3)
4. BinahBot returns a response to the user

In general, network calls are the number 1 cause of latency in an application and should be minimized and/or parallelized as much as possible.

BinahBot doesn't make a call to S3 when fetching page images nor deck thumbnails. Instead, it offers a URL from the S3, which the user's Discord client fetches.

# Code Architecture

## BinahBot

i used rust bc haha lol

rust has a discord library ([serenity.rs](https://github.com/serenity-rs/serenity)) but that library doesn't support interactions, so i just rolled my own impl. i didn't make it a library bc i don't need the entire feature set and also maintaining it is a pain; i just implemented as little as i could get away with

originally i wrote the bot in typescript and that led me to build the bot in an OOP way

OOP diagram here

however when attempting to translate my stuff into rust i ran into a lot of issues with the borrow checker

here's why OOP isn't exactly the right model to use

rethinking binahbot in terms of pure-impure sandwich

purity diagram here

build scripts are a pain but the precomputation is worth to shorten runtime (tbh i didn't measure it but mostly bc i don't want to deal with XML parsing shenanigans constantly)

oh also if you're on linux don't put your rust project on an NTFS drive. idk why but the build scripts caused some super esoteric bugs when i did this and also it corrupted my hdd constantly

photo of drive here

## CI/CD

i use cdk to automate my IaC and CircleCI as my pipeline provider. cdk is awesome, cloudformation is awesome.

circleci is ehh. i dunno why i defaulted to this instead of github actions or aws codepipeline. i guess i was bored. the free tier restrictions are a bit weird; every time i deploy i use up a decent amount of storage and apparently that goes against some kind of quota

{{ img(src="circleci_quota.png" class="ci b1") }}

it's fine tho i don't deploy very often nowadays

i kinda don't want to put in the work to switch to another cicd solution for binahbot tho. at least the dashboards are good

# Appendix

## Choice of AWS compute

todo