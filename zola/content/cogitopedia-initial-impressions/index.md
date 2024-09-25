 
+++
title = "Cogitopedia Initial Impressions"
description = "Beginning work on improving the Lobotomy Corporation documentation on Cogitopedia."
date = 2024-09-24
draft = false

[taxonomies]
tags = ["lor"]
[extra]
toc = true
+++

The only Lobotomy Corporation wiki on the internet is the Fandom wiki, and Fandom sucks. At the same time, it’s pretty much the only source of publicly available information for the game’s abnos, equipment, story, and mechanics. There's a new wiki, [Cogitopedia](https://projectmoon.miraheze.org/wiki/Main_Page), hosted on Miraheze and aiming to replace the other Fandom-based wikis, but it's slow going. Very slow going. Not many people even know it existed. I sure didn't until roughly last week.

Considering that I built BinahBot (not so humble brag), I feel like I'm uniquely positioned to accelerate developing the Lobotomy Corporation sections. The Ruina ones too, I suppose, but bleh.

Just gonna dump my initial thinking on the current state of Cogitopedia.

{{ img(src="abno-table.png" class="ci" alt="Abnormality table on Cogitopedia") }}

I find it really weird that the list of abnormalities is delegated to subsection of the "Lobotomy Corporation (game)" article. After some poking around, I found out why

{{ img(src="abno-page.png" class="ci" alt="Abnormality page on Cogitopedia") }}

They've decided to merge the concept of abnormalities from every game into a single super-article. This is great for consolidating the lore details of abnormalities into a central location, but there's a "gameplay" section that fans out to every individual game. That gameplay section should exist, but should link to a main page for that game, i.e. "Abnormality (Lobotomy Corporation)". This page should be the one that holds the abno table previously.

Speaking of the table...
- Do we really need to sort by "number"? This I presume lets one sort by numerical order...this is a derived trait from their Subject Number. I suppose this is the order that they show up in Codex? That's the only reason why I think it's worth keeping around
- No problems with the portrait inclusion, though the spacing is unusual. I know that portraits vary in size; it's a coinflip whether or not a portrait is 150x150, 256x256, or 512x512. All resized to be the same in-game though so it's good
- No complaint on name, designation number, risk level
- Enke boxes feels like a weird inclusion. Fandom has it though so ig it's fine, though I'd personally rather not
- Fandom currently has Qliphoth counter, which is also a weird inclusion. Why did whoever set this up exclude that?
- Should work damage be included? Fandom does, though not sure if I agree with that inclusion. Leaning towards no
- Don't think other fields should be included

Moving on to Punishing Bird

{{ img(src="pbird-full.png" class="ci" alt="Punishing Bird full page on Cogitopedia") }}

Firstly, I like that there's no "superentry" for "Punishing Bird" across all the games. There's no disambiguation blurb for the Library of Ruina entry which is weird (i.e. "This is Punishing Bird in Lobocorp. For Ruina, go here"). There *is* a thing in the profile template on the right, but I'll touch on that later.

The intro has a bit of redundant info, but intros are intros so it's fine. Likely going to avoid touching this via automation completely.

I don't like the game appearances section. It just doesn't do anything. The template should contain the game data, like from Fandom. Subject classification, mood ranges... in short, the things I've already prioritized in BinahBot

{{ img(src="pbird-binahbot.png" class="ci" alt="Punishing Bird on BinahBot") }}

I also want to do something about the colors also...I looked into the template and this is what I found:

```
{{Infobox Abnormality
|color=#0008FF
|engName=Punishing Bird
|korName=징벌 새
|-
|tab1=Icon
|img1=[[File:PunishingBirdIcon-LC.webp|width|150px]]
|capt1="People have been committing sins since long ago. 
Why do they commit sins, knowing it's wrong?"
|tab2=In-Game
|img2=[[File:PunishingBirdProfile-LC.webp|width|150px]]
|capt2="With this in mind, the little bird left the forest 
it had been living in, and never went back."
|-
|numb=O-02-56
|threat={{Threat Level|game=lc|threat level=teth|size=64}}
|ego=Beak
|-
|firstAppeared=[[Lobotomy Corporation (Game)|Lobotomy Corporation]]
|lastAppeared=[[Library of Ruina (Game)|Library of Ruina]]
|korVA=
}}
```

The colors are hardcoded individually, and furthermore 0x0008FF is hard to see. Again, I've already done this exercise with BinahBot so I'm thinking that I can just port the color values over:

Risk level | Color
--------|------
Zayin | 0x22f800
Teth | 0x1aa0ff
He | 0xfef900
Waw | 0x7b2ff3
Aleph | 0xfe0000

I wonder if there's enum support in the template. If not then oh well, we gotta do it this way.

Remove `engName` and `korName`. Move all localizations to a separate section. There's more than just English and Korean. Same for `korVA`. Can `threat` be an enum also? Don't really want that kind of images copied around. Can keep `ego` though as the mapping is thankfully 1:1.

Do I really want "tabs" for portrait and in-game screenshot? I kinda dislike tabs; too much clicking. This is where Fandom really fails btw; Fandom doesn't put the portrait here. I think the crop can get shoved into the gallery like a good little crop. And prioritize the portrait.

Maybe I can add an "other names" section, since some abnos have several such as Queen of Hatred ("Magical Girl")

Now looking at the table of contents: Story: "Background" and "history" are useless. I've skimmed a bit and it's either "WIP" or links to the game-agnostic abnormality entry. Which the latter I somewhat disagree with also, but w/e. I don't have any other issues with other sections from an existential standpoint. I would like a "localizations" section where we get the names in other languages though. Bulbapedia puts it under "Trivia" in a top-level section which is nice.

Game data: I dislike how spread out everything is. On one hand I feel like there's a ton of wasted horizontal space but on the other, let me check with mobile layout.

{{ img(src="pbird-phone.png" class="ci" alt="Article on mobile layout (devtools)") }}

Damn, it actually looks kinda good. It just looks sh*t on PC. Maybe need to think this more.

I think the tables that try to mix "top labels" and "side labels" should clean up their act and pick one BASIC INFORMATION. I like the work preferences are flipped 90 deg compared to the Fandom. Good work! I think Managerial tips should be in a table. Escape Info should be part of Basic Info? It's not like that in Codex actually so idk. Same with Observation levels. I mentally group them together with Basic Info even if they're technically not. But Basic Info contains internal name sooooo...

Ego equipment: cut the tab sh*t, just make it 3 tables. One for each equipment. Split this one template into 3 templates: weapon, suit, gift. Maybe add a section for "additional information" so people can just type whatever into that box.

I like the story table. Bring that in for managerial guidance

Flavor text...I need to check what tags correlate to which actions, but no complaints here. 

Don't touch images, trivia, external links via automation.

Yeah that's all I have for now. I'll get started on automating the Lobocorp pages. ETA like 2 months lol.
