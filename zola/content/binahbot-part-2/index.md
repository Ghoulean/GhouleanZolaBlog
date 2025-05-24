+++
title = "How BinahBot Works - Part 2"
description = "Discord Interactions: describing what Discord expects from bots who want to use slash commands and Interactions, and how BinahBot implements that."
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

# Introduction

Before I talk about how BinahBot retrieves pages, first I must outline how Discord Interactions (proper noun) work.

Traditionally, Discord bots have simply been regular Discord users but as a computer program. A lot of very popular bots still use this model. These bots log onto Discord, then monitor all messages in all channels that they had access in all servers they were a part of, in addition to server edits such as editing roles and emojis. Whenever the bot would feel like it (for example, if someone posted a message with the text "/help"), the bot could post its own message in the corresponding channel. These bots could even read and respond to DMs sent to them.

In 2020, Discord introduced slash commands for bots, which offered a completely a new interaction pattern (aptly named Interactions) that only bots could access. Unlike "traditional bots", who read and choose to ignore the vast majority of messages that they receive, these "interaction bots" do not receive any data about any server activity that does not directly pertain to them. This new model provides immediately appreciable advantages in terms of privacy, compute requirements, and network bandwidth.

Anyways, with Interactions, we expose a URL which acts as an API endpoint to our Discord bot. Discord makes an API request to this endpoint with a message payload and expects a payload in very specific shape within 3 seconds as a response. 

Note that without the Interaction feature, we would have not been able to use AWS Lambda as our compute. Instead we would need to poll for updates rather than listen to events.

# Request

There are many types of request payloads that Discord sends, but BinahBot responds to primarily three types: ping, new slash command, and button press.

- Ping messages are mandatory to respond; else, Discord assumes your bot is offline. Responding with a "pong" message suffices.
- New slash command messages are sent when a Discord user uses a new slash command. the bot can respond with any message. BinahBot puts its messages in a modal because I think it looks nice.
- Button press messages are sent when a Discord user clicks on a button attached to a modal that BinahBot sent previously. This payload contains information about both the original message and the button that was clicked. In response, BinahBot either edits or deletes the original message.

In all interactions, BinahBot must cryptographically verify the message in order to ensure that the message it received was sent by Discord and not someone pretending to be Discord. In short, Discord signs their messages using a private key generated at bot creation, and we verify this using our public key. Discord offers code samples in Javascript and Python for this verification; I simply translated that to Rust. 

You can check the full documentation for Discord Interactions [here](https://discord.com/developers/docs/interactions/overview).

# Response

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

# Appendix

## Discord Library

Rust does have a crate (the Rust equivalent of a "library" or "package") for Discord called [serenity.rs](https://github.com/serenity-rs/serenity). Unfortunately, that library doesn't support interactions. So in order to interact with Discord, I implemented a subset of the interactions functionality. I didn't separate the modelling out to a separate crate because I was lazy, though I probably should. In any case, I didn't need the entire feature set, and I wanted to maintain as little as I could get away with. Perhaps someone else could make use of my code one day (and if you're interested, feel free to copy what I've written so far).

## Emojis

When I first started building BinahBot, I wanted it to use emojis. 

You cannot gift bots Nitro. But bots behave as if they have Nitro. If BinahBot shares a server with these emojis, it can invoke them via the global emoji ID. You can obtain this ID by adding a `\` behind an emoji in the chat box:

{{ img(src="./emoji.png" class="ci") }}

So I spent a lot of time uploading these emojis and [mapping their IDs into BinahBot for its use](https://github.com/Ghoulean/BinahBot/blob/dfe493b124c8c2c03f0adf5b550e13baf2407f87/ruina-cdk/.env.example). Then I found out that [you can associate emojis to the application directly](https://discord.com/developers/docs/resources/emoji), and I've decided that I'm not redoing all this work.

## An Aside

Project Moon superfans would realize that the embed examples I used are displaying data from Lobotomy Corporation rather than Library of Ruina.

I chose these screenshots because Lobotomy Corporation are more complicated and thus ran into more issues compared to Library of Ruina data. Despite the differences, the overarching idea is the same. 

That being said, I'm not doing a writeup for Lobotomy Corporation.
