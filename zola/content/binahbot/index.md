+++
title = "How BinahBot Works"
description = "Brief overview on how I set up a Discord bot for Library of Ruina"
date = 2025-03-15T15:00:00Z
updated = 2025-05-25T15:00:00Z
draft = false

[taxonomies]
tags = ["lor"]
[extra]
toc = true
+++

The goal of this post is to outline how BinahBot works in a way such that a somewhat experienced programmer (~passed Intro to Programming) could replicate what I've done. I assume the reader is familiar with Discord (the IRC app), Discord bots, and basic programming concepts.

# Background

[BinahBot](https://github.com/Ghoulean/BinahBot/tree/main) is a Discord chat bot for querying data about the video game Library of Ruina.

Library of Ruina is a video game. It's a story-rich card battler with deckbuilding emphasis. In-game, cards are referred to as "pages".

Briefly, there are five different types of pages in Library of Ruina: abnormality pages ("abno pages"), combat pages, key pages, passives, and battle symbols. Okay, the last two technically aren't pages, but for BinahBot's purposes we treat them as pages.

# What do I want?

This might sound like a dumb question to ask. I want a Discord Bot for Library of Ruina, of course!

But [reality has a surprising amount of detail](http://johnsalvatier.org/blog/2017/reality-has-a-surprising-amount-of-detail); I want a card lookup, but *how* do I want to look up cards? Will I have five separate commands for the five different type of pages? What will be the name of the command(s)? Will I permit command aliasing (e.g. "abno" is an acceptable shorthand for "abnormality")? How will I educate users about how to use each command?

Underestimating a complex problem results in a low-quality solution that barely works, if it even does at all. You'll also look like an idiot (because you are). Of course, it's also possible to overcompensate and overengineer a solution that takes up an unnecessary amount of time and energy. At the risk of stating the obvious, we want to strive for an appropriate, middle-path solution that is simple relative to the complexity of the problem.

# User stories

A user story is a short narrative describing how the application behaves under user workflows. It forces planning to describe the feature as the user sees and interacts with it instead of simply mentioning that the feature exists.

Here's what I want:

## Page lookup

This is the bread and butter of what BinahBot does

- I want to be able to query for every page in the game using an omnisearch command.
  - Abno pages, combat pages, key pages, passives, battle symbols
  - In other words, I do *not* want to use separate commands for abno pages, combat pages, etc. I want to query all of these pages using a single command.
- I want to default my search to player-obtainable pages only

## Deck sharing

- I want to create and share decks, including a description on how to use the deck
- I want to edit and delete the decks I've created
- I want to browse and view decks made by others
  - Search for decks made by a specific person
  - Search for decks with a specific key page
- When viewing decks put into the bot, I want to view a thumbnail preview of the cards in the deck

## Misc

Behaviors of BinahBot shared between the other two features

- I want to restrict BinahBot's search to certain chapters in order to protect against spoilers, but only in certain channels
- I want to be able to hide command output
- I want the bot to be responsive:
  - Autocomplete suggestions should show up "relatively fast" (I eventually settled on <500 ms)
  - Command-to-output should show up "relatively fast" (<500 ms for queries; <1 second for other requests)
- I want the bot to have "reasonably high" uptime (fuzzy)
- I want to spend as little as possible while meeting the above requirements; preferably <$5/mo

# Discord Interactions

Before I talk about how BinahBot retrieves pages, first I must outline how Discord Interactions (proper noun) work.

Traditionally, Discord bots have simply been regular Discord users but as a computer program. A lot of very popular bots still use this model. These bots log onto Discord, then monitor all messages in all channels that they had access in all servers they were a part of, in addition to server edits such as editing roles and emojis. Whenever the bot would feel like it (for example, if someone posted a message with the text "/help"), the bot could post its own message in the corresponding channel. These bots could even read and respond to DMs sent to them.

In 2020, Discord introduced slash commands for bots, which offered a completely a new interaction pattern (aptly named Interactions) that only bots could access. Unlike "traditional bots", who read and choose to ignore the vast majority of messages that they receive, these "interaction bots" do not receive any data about any server activity that does not directly pertain to them. This new model provides immediately appreciable advantages in terms of privacy, compute requirements, and network bandwidth.

Anyways, with Interactions, we expose a URL which acts as an API endpoint to our Discord bot. Discord makes an API request to this endpoint with a message payload and expects a payload in very specific shape within 3 seconds as a response. 

Note that without the Interaction feature, we would have not been able to use AWS Lambda as our compute. Instead we would need to poll for updates rather than listen to events.

## Request

There are many types of request payloads that Discord sends, but BinahBot responds to primarily three types: ping, new slash command, and button press.

- Ping messages are mandatory to respond; else, Discord assumes your bot is offline. Responding with a "pong" message suffices.
- New slash command messages are sent when a Discord user uses a new slash command. the bot can respond with any message. BinahBot puts its messages in a modal because I think it looks nice.
- Button press messages are sent when a Discord user clicks on a button attached to a modal that BinahBot sent previously. This payload contains information about both the original message and the button that was clicked. In response, BinahBot either edits or deletes the original message.

In all interactions, BinahBot must cryptographically verify the message in order to ensure that the message it received was sent by Discord and not someone pretending to be Discord. In short, Discord signs their messages using a private key generated at bot creation, and we verify this using our public key. Discord offers code samples in Javascript and Python for this verification; I simply translated that to Rust. 

You can check the full documentation for Discord Interactions [here](https://discord.com/developers/docs/interactions/overview).

## Response

For new slash command and button press, BinahBot responds with a Discord embed. A Discord embed is a... it's one of these:

{{ img(src="./embed.png" class="ci") }}

Internally, it's a [blob of data](https://discord.com/developers/docs/resources/message#embed-object). BinahBot extensively uses the "fields" field, which URL embeds generally don't use. Each "field" creates a header and description.

Mentally converting the blob of data to its visual representation and back is difficult. During development I used [message.style](https://message.style/) to help visualize what the embeds should look like. As an aside, I dislike that this tool only supports darkmode because darkmode hurts my eyes; I get cross-eyed, develop a headache, and get image "burn-in" if I read darkmode layouts for too long. People keep trying to convince me it's actually the other way around, and it's lightmode that's supposed to hurt my eyes, but I disagree.

{{ img(src="./embed_visualizer.png" class="ci") }}

I'd like to call out that beyond what we put in our blob of data, we pretty much have no control over the layout. Usually Discord puts 3 fields to a row on widescreen monitors, but sometimes it decides to put 2 or 1 instead for some reason. Discord has some client-side logic internally to determine how many fields to put to a row depending on screen width (presumably), but I've tested this a bit and beyond screen width I can't figure out any deeper logic than that. For the Ruina pages, this generally hasn't been a problem. Embeds with a lot of text on it, however, just seems to linebreak whenever it wants.

{{ img(src="./screen_width.png" class="ci") }}

There's another weirdness that embeds have. Officially, embeds support exactly one image. However, they have an undocumented feature where you can "merge" multiple embeds together to create one embed with multiple images. All embeds must share the same URL field, and viola!

{{ img(src="./discord_multi_image_embed.png" class="ci") }}

Unfortunately, the behavior only seems to support up to 4 images. I originally wanted to use this undocumented feature to avoid generating my own deck thumbnails, but it seems as though this result is unavoidable. I already knew that relying on undocumented features is dangerous in general, but I wanted to see if I could do something I really shouldn't be doing and get away with it (there's no better feeling in the world).

## Discord Library

Rust does have a crate (the Rust equivalent of a "library" or "package") for Discord called [serenity.rs](https://github.com/serenity-rs/serenity). Unfortunately, that library doesn't support Interactions. So in order to interact with Discord, I implemented a subset of the Interactions functionality. I didn't separate the modelling out to a separate crate because I was lazy. Also, I didn't need the entire feature set for Interactions, and I wanted to maintain as little as I could get away with. Perhaps someone else could make use of my code one day (and if you're interested, feel free to copy what I've written so far).

## Emojis

When I first started building BinahBot, I wanted it to use emojis. 

You cannot gift bots Nitro. But bots behave as if they have Nitro. If BinahBot shares a server with these emojis, it can invoke them via the global emoji ID. You can obtain this ID by adding a `\` behind an emoji in the chat box:

{{ img(src="./emoji.png" class="ci") }}

So I spent a lot of time uploading these emojis and [mapping their IDs into BinahBot for its use](https://github.com/Ghoulean/BinahBot/blob/dfe493b124c8c2c03f0adf5b550e13baf2407f87/ruina-cdk/.env.example). Then I found out that [you can associate emojis to the application directly](https://discord.com/developers/docs/resources/emoji). Good to know for future projects, but I'm not sure how the new system works since I haven't put in the time to migrate over.


## Lobotomy Corporation?

Project Moon superfans would notice that the embed examples I used are displaying data from Lobotomy Corporation rather than Library of Ruina.

I chose these screenshots because Lobotomy Corporation are more complicated and thus ran into more issues compared to Library of Ruina data. Despite the differences, the overarching idea is the same. 

I'm not going into much detail about Lobotomy Corporation since the overarching ideas are mostly the same.

# Getting the Data

In order to build an index on Library of Ruina page data, I need to get the data.

A mod on Steam Workshop known as "BaseMod Nightly" let me extract the raw game data as XML files into its mod folder on loading the game, but only for the locale that's loaded. Library of Ruina supports 5 locales: English, Korean, Japanese, Chinese (simplified), and Chinese (traditional). You need to load the game 5 times, once in each locale, to extract all 5 XMLs.

{{ img(src="./basemod.png" class="ci b1") }}

Parsing the data is a lot harder than it should have been solely because it's in XML. In this phase, I wrote a build script to convert the XML into Rust struct declarations. The motivation behind this was to move the overhead of ramming the XMLs through a parser from runtime to build time. Build time takes like 2 minutes, and I have no idea how much time it saved given that I never bothered experimenting with the alternative.

I used [roxmltree](https://github.com/RazrFalcon/roxmltree) as the XML parser, and already in their README you can see a couple of weird quirks about the XML language that makes parsing annoying by default.

Ruina implicitly uses a bunch of default values that are discoverable through trial-and-error:

- Key pages that don't specify their range default to "Melee".
- Dynamically-added keywords (keywords added to pages via code instead of XML) are ignored. A lot of instant-use pages are improperly labeled as a result
- Missing die type (`Detail` in code) defaults to Slash
- Key pages with missing resistances default to "Normal" for all
- Key pages with missing starting light default to 3/3
- Key pages with missing base speed dice default to 1

...and a whole lot more that I'm likely forgetting about.

I chugged out the XML parsing code as quickly as I could, and it is by far the ugliest and worst part of the codebase by far. But also, I don't care. I don't care that the code sucks because code is uniquely throwaway-able: I'm technically doing codegen on a static dataset that never changes. The moment I had my generated Rust struct declarations, I could have kept just the output and then turn around and delete my parsing code. This would have saved me ~2 minutes per compile. The reason why I didn't was in case Ruina had some edge case or default value in their data that I hadn't stumbled upon yet via trial-and-error.

But anyways, we now have our data. Yippee.

## Querying the data

Ideally, the user would search up a card (say, "Weight of Sin"), and BinahBot would dutifully provide that card to the user.

{{ img(src="./binahbot_query.png" class="ci") }}

It's a lot more annoying to accomplish than it sounds.

Firstly, BinahBot doesn't *just* support player-obtainable pages. It supports enemy-side pages also. While most of the player-obtainable pages are rather clean, the same cannot be said about enemy-side pages. Project Moon often shuffles around effects among enemy pages, especially boss passives, such that the enemy *seems* to be getting the same effect from a certain passive, even when they're secretly using two different passives with slightly different behaviors. As a result, querying for a specific enemyside-only page can prove extremely challenging.

For example, "Shimmering" is a common passive on boss enemies which states:

 > At the start of each Scene, exhaust all pages in hand and deck; add new pages to hand. Their Cost becomes 0.

Library of Ruina has [**41** different Shimmering passives](https://tiphereth.zasz.su/passives/?qn=shimmering). How would the user manage to differentiate them all? How would the user even recognize that this is what's actually in the game, and not a bug?

It may be tempting to restrict BinahBot's support to only playerside pages, but sometimes name collisions still occur, such as with Electric Shock and Prepared Mind:

{{ img(src="./collisions.png" class="ci") }}

And lastly there's a whole plethora of various pages that don't have a name at all. For example, [combat page 607101](https://tiphereth.zasz.su/cards/607101/) seems strange at first glance and appears to be an unused test page. In actuality, the player-obtainable passive [Retaliate](https://tiphereth.zasz.su/passives/250222/) uses that combat page.

In summary, BinahBot needs a way to query for pages in five different languages, where page names may collide and/or not exist.

### Disambiguations

The page name -> page mapping is many-to-one. Ideally, the mapping is one-to-one (injective).

In order to differentiate cards with the same page name, I give them annotations as necessary. These annotations were inspired by Wikipedia pages; when I look up something with a name collision, Wikipedia adds disambiguation text to the article:

{{ img(src="./disambiguation.png" class="ci") }}

Most of the annotations were added programatically. Cards with a name collision that were uniquely collectable, or obtainable, or a passive, etc. were denoted as such. This covered a lot of cases, such as Electric Shock (combat page) and Electric Shock (passive), but still left many edge cases unaddressed, such as Xiao's enemyside key pages (her appearance at Liu Section I, at Xiao phase 1, and again at Xiao phase 2).

For those edge cases, I manually create and map the disambiguations. It's as painful as it sounds. Covering the playerside-only was fast and easy, but I've procrastinated on and continue to procrastinate on disambiguating the rest. For now I've merely added mappings for "common queries," which I loosely define by queries that cause people to ping me because they think there's some kind of bug (and technically, there is).

As for the nameless pages, I've deliberately excluded nameless pages without a disambiguation. So the unnamed enemyside abnormality pages are queryable, but pages like Retaliate are not.

### Page IDs

In Ruina's code, every page has a numerical ID. But two pages of different types may share the same ID. For example, the combat page "Evade" (one of the first pages you obtain during the tutorial) has an ID of 1. The key page "Patron Librarian of History's Page" (another early game page) also has an ID of 1.

Because our search is fuzzy, when I query for a page, I want to receive a list of potential matches. However, instead of returning a list of pages, I want a list of identifiers. I want these identifiers to be globally unique rather than unique within a page type. The fix is easy: append the page type to the identifier.

This trick may seem trivial to some, but it'll rear its head later. Trust.

{{ img(src="./page_id_trick.png" class="ci") }}

In summary, BinahBot treats:

- Page -> page name as one-to-many
- Page -> (locale, page name) as one-to-one
- (Locale, page name) -> page as one-to-many
- (Locale, page name, annotation) -> page as one-to-one (and exceptions to be caught and fixed as needed)
- Page -> page ID as one-to-many
- (Page ID, page type) <-> page as one-to-one and onto
- (Page ID, page type) <-> (locale, page name, annotation) as one-to-one and onto (and exceptions to be caught and fixed as needed)

## Lookup tables

Now that we can uniquely identify each entry, let's perform a lookup.

### Levenshtein

The naive way to do a lookup is to take our input string and compare it against every valid name in our little page database. The closest matches, while perhaps excluding things such as special characters, would rank highest in our search list.

The naive way to implement this would be with using [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance). Unfortunately, Levenshtein distance is *slow*: the runtime of Levenshtein comparing two strings of length `n` is `O(n^2)`...and because we cannot precompute anything except a handful of hardcoded queries, we have to run Levenshtein against all ~3,400 entries in our page database for every query. This is a small dataset, and the average experimental delay doesn't pass my personal standards.

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

Let's see if we can do better.

### Full-Text Search

Full-text search is the indexing technique for searching for text in a collection of documents (in this case, pages) which attempts to match based on the roots of words rather than individual letters. When we process the query, we map each individual word in the input to its root. This makes search robust against [inflection](https://en.wikipedia.org/wiki/Inflection). As an example, querying for "movies released in 2009" is treated exactly the same as if you searched for "movie release 2009".

This is the search algorithm that Wikipedia uses under-the-hood:

{{ img(src="./movies_released.png" class="ci") }}

I followed [this wonderful blog post by Artem Krylysov](https://artem.krylysov.com/blog/2020/07/28/lets-build-a-full-text-search-engine/) and re-implemented the rudimentary algorithm in Rust. In short, here's how the algorithm worked:

1. Take the name of every page we want to index on
2. Remove special characters and common words (such as "the", "a", and "an")
3. For each word in the page's name, reduce it to simply the root word. For example, "punishing bird" became "punish bird". This step is very hard, but thankfully [Rust has a crate for this](https://crates.io/crates/rust-stemmers/1.2.0).
4. Produce an inverted index based on these roots. In the example above, "punish" would map to pages such as "Punishing Bird" and Punishment, and "bird" would map to pages such as "Punishing Bird", "Judgement Bird", and "Big Bird"
5. When querying for a page, re-do steps 2 and 3 on the query text, generating a list of roots
6. Use the inverted index to find the page(s) with the greatest overlap over all query roots

I ran with full-text search in BinahBot and let my friends trial it. After several weeks, the results were clear: it sucks! Although performant, full-text search frequently produced low-quality results.

Because the size of the "documents" (pages) were often one or two words at most, the vast majority of queries couldn't match to the expected page due to lack of information on each page. Even with exact matches, such as "Clean", this would overlap with pages that contained that word in its entirety, such as "Clean Up", and figuring out which page "matched more" was surprisingly nontrivial.

But more critically, full-text search failed spectacularly against typos and partial searches. If the user input "degraded", then the full-text search algorithm would match the root to "grade", and then search for all pages that also contained the "grade" root. A user would search with a partial word such as "degra", expecting pages such as "Degraded Pillar", but would instead be met with zero results.  "Degra", on the other hand, isn't a word, and therefore it didn't map to a root.

We need something more robust.

### N-gram search

By sheer coincidence, around this time [M31 Coding published a blog post about fuzzy search](https://www.m31coding.com/blog/fuzzy-search.html) and it hit the front page of HackerNews. In short, n-gram search breaks up a query contiguous groups of length `n`. For example, `"Alice"` with `n=3` would get broken up into `["Ali", "lic", "ice"]`. These `n`-sized groups of individual letters are called n-grams. We then map each page to a set of n-grams, and then produce an inverted index mapping the n-grams back to the pages. To perform a query, we break the query string into n-grams using the same process we use to generate the index, and then find the combat page with the greatest overlap.

M31 Coding also includes a few additional tweaks and optimizations, which I implemented also. For example, they insert special characters as "begin word" and "end word" markers, and they treat anagrams of n-grams the same (for example, `"lic"` would be treated as equal to `"cil"`).

Anecdotally, after implementing this algorithm, BinahBot returns results quickly, and they are of high quality. So I'm satisfied with this approach.

Below are the results of a [quick and dirty benchmark test](https://github.com/Ghoulean/BinahBot/blob/acb811dbc1afcaf16a2e2f1dff2632f64def9520/rust/ruina/ruina_index/src/lib.rs#L205-L212) which, like the first test, runs a lookup against every page in the game. Due to our inverse index precomputations, we see roughly a x25 performance increase.

```bash
$ hyperfine 'cargo test --package ruina_index --lib -- tests::benchmark_query --exact --show-output --ignored'
Benchmark 1: cargo test --package ruina_index --lib -- tests::benchmark_query --exact --show-output --ignored
  Time (mean ± σ):      5.215 s ±  0.025 s    [User: 5.143 s, System: 0.072 s]
  Range (min … max):    5.189 s …  5.267 s    10 runs
```

## Code Architecture

Originally, BinahBot was written in Typescript, a language that I work with frequently during my day job. I switched to Rust halfway through development because I got bored.

In the Typescript version, I wrote BinahBot in an object-oriented way. That led to a code architecture that looked something like this:

{{ img(src="./oop2.png" class="ci") }}

In short, components were defined by their behaviors. There's an event receive component, which acted as a translation layer between "the outside world" (Discord) and BinahBot. This translated "outside events" into the internal representation of what I imagined the ideal BinahBot input would look like (command, query text, options). Then, there was an interaction payload router, which determines whether or not the payload is a ping, new slash command, or button press. The payload router would route to another router. For ping, this would return pong immediately. For a new slash command or button press, this would look at the associated command name and then route to the appropriate command handler. Each command handler would then perform various kinds of lookups to grab the page data, and then use a model transformer to translate their page into a Discord response. Finally, this response would get bubbled all the way back up to the APIGW event receptor.

While I tried to model this in terms of "layers" (as you can see in the diagram), I couldn't figure out a common interface for the routers as they returned fundamentally different data. At the time, I buffed it out with a few `// TODO`s and left it there. But I got bitten by Rust when I was moving to translate the Typescript code over.

You can see I even struggled with this during diagramming, as evidenced by the spaghetti of arrows on the right side. But since the components were fundamentally doing "the same thing", I thought it wasn't going to be a big deal.

It turns out, they're not doing the same thing. Object oriented programming can be a powerful paradigm *if* you can apply SOLID principles to your domain. The oft-forgotten L stands for Liskov substitution principle: you *must* be able to substitute a correct implementation of a component with another correct implementation. In BinahBot, we can't do that: for example, an abno page transformer *cannot* substitute a combat page transformer. One transforms abno pages. The other transforms combat pages. No generic "transformer" superclass can suitably exist.

Another, more subtle issue exists: code reuse is not clear when separate components share similar functionality. Both the `/lor` command and the `/lor` autocomplete want to do some processing on the plaintext query in an attempt to translate that into a page. But code-wise, where do you put it? One component cannot, and should not, inherit the other. The best you can do is shove the common part of the code into a utility class, or somehow extract the functionality into a library.

We can fix these seemingly-glaring issues with our architecture by sacrificing a little bit of that OOP-ness and re-evaluate BinahBot in terms of a [pure-impure sandwich](https://blog.ploeh.dk/2020/03/02/impureim-sandwich/). Essentially, rather than designing BinahBot in terms of strict, hierarchical layers, imagine BinahBot in terms of inbound and outbound network calls, and designing the components appropriately.

Going Full Functional™ with BinahBot makes every path incredibly convoluted. I won't even bother trying to draw a diagram of it.

But it did open up my mind to remove all inheritence, which immediately fixed all my OOP problems by not treating the code as using OOP. Rather than focusing on what each component does, look instead to what each component takes in as an input and produces as output.

Note that if some functionality of a component may eventually need to make a downstream call, that component is impure and needed to receive downstream clients as an input. (For example, if my component needed to call AWS Secrets Manager, it had to accept an AWS Secrets Manager client). Thus, I tossed all my downstream clients into an `env` blob that I passed into my impure components. This blob is technically more heavy than necessary since not all impure components needed every part of the `env` blob, but it worked, so eh.

# Choosing a Hosting Provider

Now that we got most of the core functionality down, let's talk about bot hosting solutions. I had two fuzzy goals in mind: keep "reasonably high" uptime while minimizing costs.

The uptime requirement practically forces me to use a cloud computing platform as a host because I don't trust my home internet to not die randomly in the middle of the night while I sleep. I picked AWS as my compute platform because I use AWS for work so I'm familiar with their offerings. Also I'm biased. I've briefly considered using not-AWS as a hosting option, and I've concluded that it wasn't worth my time or energy to compare them.

Requests were likely to be low-volume and sporadically distributed. I estimated that each request to the Discord bot would take half a second at most with the majority of the time consumed by network latency (considering that Rust is blazingly 🔥 fast 🚀, and all I'm doing is a fancy lookup). Although I wanted to minimize latency, ideally <100 ms, I had no hard requirement here; I could accept if this was relaxed. Lastly, Discord requires me to expose an API endpoint to invoke BinahBot.

Therefore:
- For running BinahBot's code, I use AWS Lambda. See the Appendix for a discussion on cloud compute options.
- To expose the API to Discord, I use AWS API Gateway.
- I use AWS S3 for image storage (page art, etc) and AWS DynamoDB to hold Discord interaction tokens and user-submitted decks
- Lastly, I use AWS Secrets Manager for holding secrets that I need to access during runtime.

If you're not familiar with AWS, the tl;dr of what this is is that I'm renting a bunch of pre-built components and taping them together to host my bot.

I separate the thumbnail-making functionality to a separate Lambda because the operation takes ~850 ms in the worst case scenario. This wasn't part of the original planned infrastructure; I underestimated the latency of image creation and write.

The full infrastructure looks something like this:

{{ img(src="./infra.png" class="ci") }}

By the way, although AWS is one of if not the best cloud compute service in the world, it is still very easy to shoot yourself in the foot and lose hundreds of dollars by accidentally leaving an instance on for like two days. If you're an excited newbie programmer who wants to replicate what I'm doing, I urge you to talk to a knowledgable expert before proceeding with your own project. Spending money on cool tech doesn't make you a good software developer.

## CI/CD

CI/CD means whenever I push my code to GitHub, the new code automatically gets built and deployed to production. CI/CD is awesome. What it stands for doesn't matter.

Earlier in this article, I mentioned that I use AWS to host my infrastructure. You might think I go to Amazon.com and click a bunch of buttons on a dashboard to spin up a bunch of virtual machines in their data warehouses. I could do that, but there's a better way. AWS offers a service known as CloudFormation, which lets me upload a template that spins up all the infrastructure I want. Furthermore, AWS offers a library known as the AWS CDK ("Cloud Development Kit", written in Javascript and Typescript), which lets me write that template in code rather than as a JSON file, and also build and deploy that automatically.

As an analogy, let's say I want to build a house. "Clicking a bunch of buttons on the AWS dashboard" is like figuring out the design as I lay down the bricks. CloudFormation is like being handed a blueprint before starting a build. CDK is like using AutoCAD to help design and draw the blueprint.

In any case. CDK is awesome. CloudFormation is awesome.

Now that both my infrastructure and BinahBot are technically both code, I can push both to Github and automatically deploy both infrastructure and application code at the same time, automatically. The next thing to tackle is to set up that mechanism.

I've previously used Github Actions to trigger CI/CD workflows -- this blog, in fact, uses Github Actions to push all my blog updates live. But for BinahBot, I tried something different: CircleCI.

I have no idea why I didn't at least attempt using AWS CodePipeline. (Given how much of AWS I'm using already, it should have been the default choice.) And honestly, I kind of regret using CircleCI. Their free tier restrictions are kinda weird. Every time I deploy I use up a decent amount of storage and that apparently goes against some quota that I still don't understand.

{{ img(src="./circleci_quota.png" class="ci b1") }}

It's fine given that I don't really push much updates on BinahBot often anymore as it's quite mature by now. Despite my grievances against CircleCI, it still *works*. I think switching to CodePipeline would take a lot more work in exchange for basically no visible effect.

# Deckbuilding - CRUDing it up

CRUD stands for Create, Read, Update, Delete. This pattern can be commonly found throughout software, but primarily when working with databases, web applications, or web applications that front a database.

Fortunately for us, saving a deck in BinahBot, viewing others' decks, updating one's own decks, and deleting one's own decks, exactly follows this CRUD pattern. Implementation for `/createdeck`, `/deck`, `/updatedeck`, and `/deletedeck` was straightforward and uneventful.

## I use AWS DynamoDB BTW

Nevermind, implementation was not straightforward nor uneventful.

AWS DynamoDB is a NoSQL (nonrelational) database. Nonrelational databases derive their stronger-than-RDMS performance by basically being a giant hash table. Their biggest downside is that they cannot effectively perform joins. If a join is required, the data must be denormalized. Thus, NoSQL databases must take into consideration all query patterns into account during the design phase because its inflexibility prevents building more features on top of the same data.

I chose AWS DynamoDB over a relational database because I was familiar with DynamoDB. In retrospect, this was a bad decision, and I should have went for a relational database.

But anyways, here's a list of all my usage patterns:
- Given a deck name and author, return the associated deck
  - I wanted to avoid a "global namespace" of deck names (e.g. if someone makes a deck for Red Mist named "Red Mist", it doesn't prevent others from making their own Red Mist deck that's also named "Red Mist")
  - I also want to avoid the headache of disambiguation if someone makes two decks with the same name
  - Thus, in this design, (deck name, author) uniquely identifies a deck
- Given a deck name, author, deck data, and optionally a description, create a deck
- Given an existing deck name, author, deck data (optional), and description (optional), update an existing deck
- Given an existing deck name and author, delete the associated deck
- Given an author, return all of their decks
- Given a key page, return all of their decks
- Return the top N decks that best match a query

The author (encoded via Discord user ID) is the hash (partition) key; the deck name is the sort key. Combined, the (author, deck name) forms the primary identifier for each deck, and thus the implementations for `/createdeck`, `/deck`, `/updatedeck`, and `/deletedeck` were straightforward and uneventful.

Since author is the hash key, we can easily obtain the list of all decks from a given author using the DynamoDB Query API: return all items with the given hash key. We can do something similar for key page, but we must set up a secondary global index for this query.

I implemented the last access pattern (searching the top N decks) using a full table scan. Obviously, downloading the entire database every time I perform an autocomplete check is unscalable. Unfortunately, more sophisticated solutions such as AWS ElastiCache, OpenSearch, or spinning up my own indexing service, cost way too much time and money that was outside of BinahBot's scope. Additionally, running a relational database would not have solved this issue for me either. So far this hasn't broken on me yet, but it definitely will one day and that would suck.

### AWS DynamoDB Design

The way I talk about structuring my DynamoDB data may seem wrong to someone who has only worked with relational databases before. I recommend watching [Alex Debrie's video on single-table design](https://www.youtube.com/watch?v=BnDKD_Zv0og) for a quick rundown on how to think about non-relational databases.

**You should not literally use one NoSQL DynamoDB for your application**. Single-table design is applicable only for pedagogical purposes, and you shouldn't do this on production because you lose the ability to apply different backup settings, time-to-live, encryption, access controls, etc. depending on content.

## Thumbnail

We create the thumbnail by taking the combat page art, "stitching" them together into a 3x3 grid, and saving the result into an S3 bucket.

That's the easy part. The hard part is calling this function under a technical requirement: as previously mentioned, all requests to BinahBot should return a response "reasonably fast". Downloading combat page art is up to 9 parallelizable network calls; saving the thumbnail is another network call.

To address this, I separated the thumbnail-generating functionality into a second lambda. BinahBot main fires-and-forgets the second lambda, which generates the thumbnail asynchronously. Unfortunately, due to this separation, it may take around ~5 seconds between a `/createdeck` command and the actual thumbnail generation. But thumbnail generation isn't particularly latency-sensitive, and so far no one has noticed this yet.

Initially, the thumbnail generation code was bugged because [Unlock's](https://tiphereth.zasz.su/cards/605008/) image is a different size from every other card art in the game, and I failed to account for this. After fixing this bug, Discord still showed the old thumbnail. Discord caches these thumbnails on their side, and from what I can tell Discord also keeps images in cache for a surprisingly long time; I've never seen it refresh its cache by itself. To trick Discord into "refreshing" its cache, append `?1` or some other meaningless query parameter so Discord believes that it's serving a completely new image.

## Downstreams

For `/lor`, BinahBot only uses the data that it's pre-extracted to perform the query. For `/createdeck` and other related commands, we need to call additional downstream dependencies.

Here's the flow:

1. User calls `/createdeck` and inputs a deck URL built from Tiphereth's deck editor
  - Example: [Nikolai build](https://tiphereth.zasz.su/u/decks/CS-iR8cs_8_nUNrE-G0Yi7/)
2. BinahBot receives the request, and calls Tiphereth to convert the deck URL into deck data
3. Simultaneously,
  - BinahBot saves the deck data into DynamoDB, taking note of the deck name, author, and keypage as indices
  - BinahBot asynchronously fires-and-forgets a call to the thumbnail Lambda, which (hopefully) generates a thumbnail for the deck (that saves to S3)
4. BinahBot returns a response to the user

In general, network calls are the number 1 cause of latency in an application and should be minimized and parallelized as much as possible. Even Levenshtein search is faster than one network call.

One trick that BinahBot uses to minimize latency is that it doesn't make a call to our S3 bucket when fetching page images or deck thumbnails. Instead, it constructs a URL that points to an image in the S3 bucket, which the user's Discord client fetches.

# Final Thoughts

It was kinda fun to build BinahBot, but after like 8 months of working on this project on-and-off I'm getting bored and I'm starting to move away from both the project and Project Moon as a whole.

A lot of the code I wrote and concepts I use aren't particularly unique to BinahBot and can be applied to your projects also.

# Appendix

## Rust on Shared NTFS Drive

My workstation is somewhat weird: I dual-boot Ubuntu with Windows with both operating systems on the same shared NVME drive, but on separate partitions. Ubuntu is my daily driver, but I occasionally switch to Windows for gaming purposes. My computer also has a HDD and an SSD which I use as a file share between the two operating systems. Both use the NTFS3 file system for compatibility reasons.

For some reason, I initially put BinahBot on my NTFS3 HDD. I quickly ran into issues with the build scripts: they were causing some super esoteric problems where running `cargo build` or even simply `cargo check` would either return `os error 22` (??) or even lock up my computer (???), and I would be forced to REISUB or even power cycle just to recover. Even after swapping out a bad RAM stick and switching from the HDD to the SSD, I kept encountering this issue. I have never had any issues with this dual setup *except* when working with this combination of Linux + external NTFS drive + Rust + build script.

{{ img(src="./drive.jpg" class="ci" alt="I slammed headfirst into this issue so many times, it killed some sectors on my HDD!") }}

I slammed headfirst into this issue so many times, it killed some sectors on my HDD!

There's actually a [related open Github issue for this](https://github.com/rust-lang/cargo/issues/13526), but it's so rare and requires so many stars to align to reproduce that the current advice seems to be "don't mix Linux and NTFS if you can help it".

## What is AWS Lambda?

There are two main compute services that AWS offers: EC2 and Lambda. Okay, actually, there's a lot more (ECS, Fargate, Batch...) but I'm only going to work with these two.

EC2 is basically a virtual machine. You choose your hardware, AWS does some stuff, and bam, you now have access to that box. It's pretty straightforward and it's what you pretty much expect to get when you rent a computer "in the cloud". DigitalOcean's "droplets" and Heroku's "dynos" are both very similar to AWS's EC2.

Lambda is a "serverless function". Obviously, there's still a server hosting this, so the "serverless" part is just a marketing term to mean that you're not going to be fiddling around with any of the underlying hardware. But "function"? You upload a library that exposes a function interface, and when you invoke your Lambda via HTTPS call, your function code runs and responds. Unlike a server hosted on EC2 (which needs to run 24/7 to accept requests), Lambda only runs when you invoke it; consequentially, you only pay AWS when your Lambda runs.

To illustrate, here's a Java example. You write and upload a jar file that exposes something that looks like this:

```java
package com.example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.example.Request;

public class HelloWorldHandler implements RequestHandler<Request, String> {
    @Override
    public String handleRequest(final Request event, final Context context) {
        // your code here
        return "Hello World!";
    }
}
```

Feel free to check out the [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) to learn more.

## Choice of AWS Compute

There are two main compute services that AWS offers: EC2 and Lambda. I'm going to handwave over the others.

Tl;dr:

- EC2 offers the best hardware and greatest freedom, but is expensive and time-consuming to manage
- Lambda is fast, easy, and costs no money if it's not being used; but has some weird limitations that are either expensive (sometimes greater than EC2) or impossible to address

Choose not-Lambda if any of the following hold or may hold in the future hold:
- Some requests must run for greater than 15 minutes
  - Lambda aborts requests that hit the 15 minute timeout. There is no way to raise this limit.
- Strong low latency requirements
  - If Lambda wasn't invoked recently, it "sleeps". While sleeping, Lambda costs no money. However, the next response needs to "wake up" the Lambda, and the cold start time may cause noticable latency ranging from a few milliseconds to a few seconds.
- Significant disk storage requirements
  - Lambda has a soft limit of 512 MB (can raise if you pay) and hard limit of 10 GB  
  - You can still use S3 and access databases such as DynamoDB and Athena
- Require special hardware
  - You cannot choose your hardware with Lambda
  - Lambda does not have GPU access

If none of these apply, congrats! Try Lambda.
