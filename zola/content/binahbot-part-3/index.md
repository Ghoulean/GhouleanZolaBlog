+++
title = "How BinahBot Works - Part 3"
description = "Page lookup: algorithms used in BinahBot for indexing, searching, and querying pages."
date = 2025-03-15T15:00:00Z
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

# Querying the data

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

## Disambiguations

The page name -> page mapping is many-to-one. Ideally, the mapping is one-to-one (injective).

In order to differentiate cards with the same page name, I give them annotations as necessary. These annotations were inspired by Wikipedia pages; when I look up something with a name collision, Wikipedia adds disambiguation text to the article:

{{ img(src="./disambiguation.png" class="ci") }}

Most of the annotations were added programatically. Cards with a name collision that were uniquely collectable, or obtainable, or a passive, etc. were denoted as such. This covered a lot of cases, such as Electric Shock (combat page) and Electric Shock (passive), but still left many edge cases unaddressed, such as Xiao's enemyside key pages (her appearance at Liu Section I, at Xiao phase 1, and again at Xiao phase 2).

For those edge cases, I manually create and map the disambiguations. It's as painful as it sounds. Covering the playerside-only was fast and easy, but I've procrastinated on and continue to procrastinate on disambiguating the rest. For now I've merely added mappings for "common queries," which I loosely define by queries that cause people to ping me because they think there's some kind of bug (and technically, there is).

As for the nameless pages, I've deliberately excluded nameless pages without a disambiguation. So the unnamed enemyside abnormality pages are queryable, but pages like Retaliate are not.

## Page IDs

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

# Lookup tables

Now that we can uniquely identify each entry, let's perform a lookup.

## Levenshtein

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

## Full-Text Search

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

## N-gram search

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

# Code Architecture

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

# An Aside

My workstation is somewhat weird: I dual-boot Ubuntu with Windows with both operating systems on the same shared NVME drive, but on separate partitions. Ubuntu is my daily driver, but I occasionally switch to Windows for gaming purposes. My computer also has a HDD and an SSD which I use as a file share between the two operating systems. Both use the NTFS3 file system for compatibility reasons.

For some reason, I initially put BinahBot on my NTFS3 HDD. I quickly ran into issues with the build scripts: they were causing some super esoteric problems where running `cargo build` or even simply `cargo check` would either return `os error 22` (??) or even lock up my computer (???), and I would be forced to REISUB or even power cycle just to recover. Even after swapping out a bad RAM stick and switching from the HDD to the SSD, I kept encountering this issue. I have never had any issues with this dual setup *except* when working with this combination of Linux + external NTFS drive + Rust + build script.

{{ img(src="./drive.jpg" class="ci" alt="I slammed headfirst into this issue so many times, it killed some sectors on my HDD!") }}

I slammed headfirst into this issue so many times, it killed some sectors on my HDD!

There's actually a [related open Github issue for this](https://github.com/rust-lang/cargo/issues/13526), but it's so rare and requires so many stars to align to reproduce that the current advice seems to be "don't mix Linux and NTFS if you can help it".