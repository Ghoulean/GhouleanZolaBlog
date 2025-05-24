+++
title = "How BinahBot Works - Part 5"
description = "Deckbuilding and sharing"
date = 2025-03-15T15:00:00Z
draft = true

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

# CRUDing It Up

CRUD stands for Create, Read, Update, Delete. This pattern can be commonly found throughout software, but primarily when working with databases, web applications, or web applications that front a database.

Fortunately for us, saving a deck in BinahBot, viewing others' decks, updating one's own decks, and deleting one's own decks, exactly follows this CRUD pattern. Implementation for `/createdeck`, `/deck`, `/updatedeck`, and `/deletedeck` was straightforward and uneventful.

# I use AWS DynamoDB BTW

Nevermind, implementation was not straightforward nor uneventful.

AWS DynamoDB is a NoSQL (nonrelational) database. Nonrelational databases derive their stronger-than-RDMS performance by basically being a giant hash table. Their biggest downside is that they cannot perform complex queries. I chose DynamoDB because I already know all my usage patterns upfront, and furthermore I'm unwilling to add the capability to perform these complex, "low value" queries (e.g. I feel like queries such as "give me every deck that uses Will of the Prescript" will be used once, ever).

Here's a list of all my usage patterns (very important exercise if you're ever using NoSQL):
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

The author (encoded via Discord user ID) is the hash key; the deck name is the sort key. With the keys set up, implementation for `/createdeck`, `/deck`, `/updatedeck`, and `/deletedeck` was straightforward and uneventful.

Since author is the hash key, we can easily obtain the list of all decks from a given author using the Query API. We can do something similar for key page, but we must set up a secondary global index for this query.

I implement the last access pattern using a full table scan. Obviously, downloading the entire database every time I perform an autocomplete check is unscalable. Unfortunately, more sophisticated solutions such as AWS ElastiCache, OpenSearch, or spinning up my own indexing service, cost way too much time and money that was outside of BinahBot's scope. So far this hasn't broken on me yet, but it definitely will one day and that would suck.

## AWS DynamoDB Design

The way I talk about structuring my DynamoDB data will seem wrong to someone who has only worked with relational databases before. I recommend watching [Alex Debrie's video on single-table design](https://www.youtube.com/watch?v=BnDKD_Zv0og) for a quick rundown on how to think about non-relational databases.

**You should not literally use one NoSQL table for your application**. Single-table design is applicable only for pedagogical purposes, and you shouldn't do this on production because you lose the ability to apply different backup settings, time-to-live, encryption, etc. depending on content.

# Thumbnail

We create the thumbnail by taking the combat page art, "stitching" them together into a 3x3 grid, and saving the result into an S3 bucket.

That's the easy part. The hard part is calling this function, and it's hard for a reasons other than the task itself: as previously mentioned, all requests should return a response "reasonably fast". Downloading combat page art is up to 9 parallelizable network calls; saving the thumbnail is another network call.

To address this, I separated the thumbnail-generating functionality into a second lambda. BinahBot main fires-and-forgets the second lambda, which generates the thumbnail asynchronously. Unfortunately, due to this separation, it may take around ~5 seconds between a `/createdeck` command and the actual thumbnail generation. But thumbnail generation isn't particularly latency-sensitive, and so far no one has noticed this yet.

Initially, the thumbnail generation code was bugged because [Unlock's](https://tiphereth.zasz.su/cards/605008/) image is a different size from every other card art in the game, and I failed to account for this. After fixing this bug, Discord still showed the old thumbnail. Discord caches these thumbnails on their side, and from what I can tell Discord also keeps images in cache for a surprisingly long time; I've never seen it refresh its cache by itself. To trick Discord into "refreshing" its cache, append `?1` or some other meaningless query parameter so Discord believes that it's serving a completely new image.

# Downstreams

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
