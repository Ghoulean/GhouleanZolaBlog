+++
title = "98 Bugs in Library of Ruina Bug"
description = "A list of every bug I can think of"
date = 2026-07-26T15:00:00Z

[taxonomies]
tags = ["lor"]
[extra]
toc = true
+++

# Introduction

This is not an exhaustive list and focuses only on bugs that are visible during vanilla gameplay.

Video form of this post: [https://youtu.be/h42E4AKlU7k](https://youtu.be/h42E4AKlU7k)

# The List

1. Matchlight applies its buff to the same combat page twice if its first two uses are on the same card. This double-marked combat page receives the Matchlight visual mark twice, though it functions identically to being marked once.
2. Footfalls deals damage based on the user's Max HP, not the target's Max HP.
3. Display of Affection decreases dice power when using or defending against a mass attack.
4. Gluttony procs on all mass attack hits if the mass's primary target was previously hit this Scene, rather than on a per-target basis.
5. Rhythm's buff may only affect librarians, not enemies.
    - This affects the English, Korean, and Japanese localizations; the Chinese and Traditional Chinese card text correctly states that the buff only affects ally librarians.
6. Rhythm (the abnormality page) says the buff lasts only 1 Scene, but the buff description says it loses 1 stack per Scene instead. The buff description is correct; the abnormality page description is not.
7. Eternal Rest procs on the enemy with less HP than all librarians, not the enemy with the least HP among all other enemies.
8. Eternal Rest deals 2-6 damage and 2-4 Stagger damage instead of 2-7 and 2-5, respectively.
9. Lament places the damage amplification buff on all units, so allies with status ailments also take +2-4 extra damage from enemies, not only the librarian attacking debuffed enemies.
10. Coffin sometimes destroys a combat page this Scene.
    - On a successful hit, Coffin tries to destroy the combat page tied to the sealed die, using the formula `<speed dice from passives> - <broken speed dice from passives> - <broken speed dice from other buffs> - 1`, 0-indexed from the character's leftmost die.
    - "Broken speed dice from other buffs" actually adds together "speed dice broken this Scene" and "speed dice broken next Scene," effectively double-counting dice broken this Scene. That usually points the formula at a negative index, so it often destroys nothing this scene (it still correctly applies the "broken speed die" buff next scene).
    - It also only counts speed dice granted by passives, ignoring the innate speed dice on key pages, which most boss key pages have.
11. Shyness's effect persists until another combat page is used, even if those dice do not belong to the original combat page (e.g. counter dice and retained dice).
    - I've heard that it can persist across Scenes, but I haven't been able to replicate this.
12. Glitter's visual effect is sometimes misplaced or not visible.
    - This generally affects enemies without a well-defined "head" for the effect to attach to.
13. Obsession only boosts bleed infliction from combat pages (and not from passives nor abnormality pages).
14. Funny Prank deals 2-4 self-damage on a min roll, not 2-7.
15. Loving Family doesn't reset its Nettle Clothing buff between acts, allowing the buff to carry over to the next act.
16. Loving Family's buff states that a stack is lost upon taking a hit, but it actually loses a stack at the end of Scene.
    - This affects the English localization only; Korean, Japanese, Chinese, and Traditional Chinese are correct.
17. Incomprehensible's chance to inflict never resets back to 50%, not even at Act end.
18. Spring's Genesis counts only hits dealt by the librarian toward the 4-hit Petal trigger, not hits from any source.
19. Fervent Adoration only allows enemies to target their own allies. Enemies with custom targeting AI ignore this flag entirely.
20. Fervent Adoration increases damage taken by 2-4, not damage dealt.
    - This affects the English, Korean, Chinese, and Traditional Chinese localizations; the Japanese localization correctly state that the page increases damage taken.
21. The Finale triggers only once per round regardless of how many enemies were staggered, not once per stagger.
22. The Finale doesn't reset its trigger at Act end, allowing the light loss effect to activate on the first Scene of the next Act.
23. Hate's stagger damage isn't limited to 2 procs per Scene. (The Strength gain correctly is.)
24. Wrath + Nihil permits the librarian to target their own allies.
25. Acidic Sludge doesn't apply Bind on the Scene it is selected.
26. Prey never reapplies its mark, not even across Acts.
27. Vengeance sometimes grants more Strength than intended.
    - Its Strength-gain calculation rounds instead of floors: taking 3-4 damage rounds up to 5, and 8-9 damage rounds up to 10, granting 1 and 2 Strength respectively instead of the intended 0 and 1.
28. Claws of Savagery doesn't reset its accumulated-damage trigger at Act end, allowing the untargetable + unclashable effect to carry over into the next Act.
29. The Role of the Wolf inflicts 1-2 Fragile on winning a Counter die clash, not always 2.
    - This affects the English localization only; Korean, Japanese, Chinese, and Traditional Chinese correctly cite 1-2 Fragile.
30. Absorption's Strength gain also lasts only until the end of the current Act.
31. Laughter always fires when hit under 50% HP, not at a 50% chance.
32. Fear of Water's self-damage doesn't count as damage, and therefore doesn't proc Claws of Savagery.
33. Fear of Water's Strength gain occurs on the same Scene as obtaining 15 Blood instead of next Scene.
34. Torn Off Wisdom doesn't restore Light if it doesn't discard a page.
35. A Warm Heart checks the previous Scene's leftover Light (captured at Scene end), not the starting Light after refill.
36. A Warm Heart doesn't reset its leftover Light check at Act end, allowing the buff (or lack thereof) to carry over into the next Act.
37. Cardiae reduces the cost of 1 card, not 2, when the 15-damage threshold is met without a kill.
38. Cardiae doesn't reset its trigger at Act end, allowing the effect to carry over into the next Act.
39. Home's target count is based on the number of enemies, not allies.
40. Home doesn't properly reset its clash order tracking at the start of Scene. The reset only applies to one librarian (usually Chesed), not all allies.
41. Emerald's on-hit light restore effect applies to all librarians that hit the target, not just the owner of Emerald.
42. Salvation only grants +1 power in clashes, not 1-sided attacks nor masses.
    - I've heard that this stacks indefinitely on counter dice, but I couldn't reproduce this.
43. Judgement incorrectly applies damage from Sin as true damage, bypassing the Sin immunity granted from Long Arms.
44. Small Beak creates a new copy of the page on-use instead of returning the same page to hand.
    - Consequently, any cost-increasing effects affecting the page are reset after one use.
45. Silence can set speed dice values to 0.
46. Silence can make infinity dice redirectable.
    - The Strongest internally sets speed dice to 999 speed, and the game renders speed dice of 999 or greater as infinity.
47. Silence can turn infinity dice into 99 speed
    - Actually, the speed value is 994, but the 4 gets cut off on the display
48. Divine Power procs if WhiteNight is currently active, not if its effect has been activated previously.
49. Apostles resets its Baptism counter at the start of every Act.
50. Pale Hands's stacks are reset if the librarian uses a mass attack and primary targets a different target.
51. Pulsation checks whether any HP damage was dealt from any source in this Scene, not whether Offensive dice specifically dealt damage.
    - For example, winning a clash with the Double Kick passive using block or evade dice still satisfies it.
52. Learn treats counter dice as thought they are noncounter dice.
53. Curiosity procs before natural draw, so the librarian ends up with 5 or 6 pages in hand instead of 4.
54. Using Paradise Lost twice or more creates a background effect that remains across receptions until the game is restarted.
55. Raging Storm: Love's first die sometimes deals no damage.
    - I don't know the exact mechanism behind this, but it is apparently due to an asynchronous processing bug in its animation 
56. Stigmatize, Inner Ardor, and All-out War grant their emotion point after use (i.e. after rolling dice and clashing), not on use (i.e. before rolling dice and clashing).
57. Shock Round only checks if the first discarded page is an Ammunition.
    - As a consequence, it can only gain at most 1 power.
58. Mind Crush softlocks the game if it has no living targets.
59. Sakura may attempt to discard the same page multiple times, resulting in discarding less than 4 pages on use.
60. Straining Strings (both playerside and enemyside) and Drawing the Strings Taut plays the attack sound an extra time after a delay.
61. Only one copy of "To Claim Their Bones" can be held at a time. This is undocumented.
    - The page is missing its ability description entirely; unlike Pinpoint Breakthrough, it never states this restriction in text.
62. Information Assessment checks HP resistance, not Stagger resistance, when attempting to modify a unit's stagger resistance.
    - To elaborate: at the start of the Scene, Information Assessment attempts to find a random enemy's resistance to a random damage type that are "Endured" or "Normal". However, when it attempts to check for an enemy's stagger resistance, it actually checks the corresponding HP resistance instead. Thus, for example, an enemy with "endured" slash HP resistance against but an "immune" slash stagger resistance is able to modify the "immune" stagger resistance.
63. Slash/Blunt stances only give damage/Stagger damage bonuses to dice of the corresponding types. Pierce/Guard stances, however, give their secondary benefits regardless of current die type.
    - It's not clear whether or not the stance bonus applies regardless of die type or not
64. The Steam achievement "Orlando Furioso" only requires killing Argalia with Orlando Furioso, not both Argalia and Olivier.
65. Purple Tear can't teleport to Chesed nor Hokma floor.
    - During Library of Ruina's early access, Purple Tear's fight was released before Chesed realization and Hokma realization were available. Thus, this restriction was intentionally put in place to ensure that Purple Tear teleports to a strong floor. This restriction was never removed.
66. Autoplay (P) always targets the first speed die in phase 1 of Black Silence.
67. In Black Silence reception, Image of the Bygones (Pulsation) loses its speed die upon reaching emotion level 4. Additionally, autoplay (P) in this state may cause the game to softlock.
    - The passive responsible for this scales the number of speed dice lost off the emotion level, for no apparent reason.
    - Autoplay is capable of targeting Image of the Bygones despite its lack of speed dice, which is what causes the softlock.
68. In Black Silence reception, Amalgamated Sinews, Waltz in Black, and Waltz in White destroy all of their dice on clash draw as well.
69. Fairy Festival's Ravenousness passive grants 30 Haste and 30 Strength, not just 30 Strength. This is undocumented.
70. Every 3 scenes, Queen Bee's stagger resistances turn Fatal. This is undocumented.
71. Child of the Galaxy's blobs do not restore 10% of max HP if its ally is at 1 HP. This is undocumented.
72. Child of the Galaxy's blobs re-stagger themselves 1 Scene after getting up.
    - This self-stagger counts towards the revival timer if the blob gets attacked to 1 HP during this time.
    - I don't know why this happens
73. Alruine's Spring Genesis grants 1 Strength to allies on-hit, not 2.
    - This only affects the English localization; Korean, Japanese, Chinese, and Traditional Chinese correctly cite 1 Strength gain.
74. Alruine's Autumn's Passing clash win effect does nothing.
75. Judgement Bird says it loses 25% of max Stagger resist upon using one of its Judgement pages, but it actually loses 20%.
    - This affects the English, Japanese, Chinese, and Traditional Chinese localizations; Korean correctly cites 20%.
76. Garde du Corps's second die in Malkuth Realization doesn't inflict any paralysis on-hit.
77. Magical Girl of Justice's (Knight of Despair) cards deal 10 maximum damage, not 12, during the Knight of Despair phase of Nihil's fight.
    - This affects the English localization only; Korean, Japanese, Chinese, and Traditional Chinese correctly cite the 10 max damage threshold.
78. Nothing There's "Hardness" passive ignores instances of damage that would deal 5 damage or less, not 10.
    - This affects the English and Japanese localizations only; Korean, Chinese, and Traditional Chinese correctly cite the 5 damage threshold.
79. During Bloodbath's fight, if Angela dies by the end of turn 3, she will become invincible and untargetable for the remainder of the fight. You can still win.
80. In the librarian customization screen, certain colors are inaccessible.
    - The color picker works in HSV, but colors are stored as RGB under the hood.
    - RGB's color space has 256^3 values while HSV's has 180 * 256^2, so the RGB -> HSV -> RGB roundtrip is lossy: converting a chosen color to HSV and back can land on a slightly different RGB value than the one originally picked due to numerical instability in the conversion.
81. The Red Mist's page is visually equipable for Gebura even when it's used for passive attribution on another keypage.
82. In the passive attribution menu, "Recovery" returns no results.
    - In the English localization, the filter searches for passives with the text "recovery" in it. However, all passives in this game use "recover" or "recovers", e.g. Emergency Rations "Recover 2 HP at the start of each Scene". Thus the search never returns any results
    - This affects the English localization only; Korean, Japanese, Chinese, and Traditional Chinese are correct.
83. In the passive attribution menu, using capital letters breaks the results.
    - This affects the English localization only; Korean, Japanese, Chinese, and Traditional Chinese do not have capital letters.
84. Switching targets using Tab with Raging Storm: Harm reverts Lowell's visual stance.
85. In Appearance Projection, several keypages are incorrectly included in the "Canard" category.
86. In Appearance Projection, if the assistant librarian has a melee-only keypage equipped, the "random" feature selects between only Malkuth assistant librarian and Yesod assistant librarian.
87. In Appearance Projection, if the assistant librarian has a ranged or hybrid keypage equipped, the "random" feature doesn't update the actual librarian appearance (unless random rolls into another ranged or hybrid keypage).
88. Valentin is missing voicelines in the Korean localization.
89. Dead librarians sometimes stay on screen.
    - I don't know the exact mechanism behind why this happens, but this usually occurs with Wrath of Torment suicide strategies.
90. Awakening (Green) Abnormality page text is colored as though it's on a Breakdown (Red) page after picking a Floor EGO page.
91. Positive/negative emotion point ratio displayed during abnormality page selection only uses emotion points from living librarians; the actual abnormality page selection logic uses emotion points from both dead and living librarians.
92. Recovering stagger resist when at maximum stagger bar displays the amount of stagger that would have been restored, not the actual amount of stagger restored.
    - Inconsistent with how healing displays in the same situation.
93. Combat pages can no longer play the "unselectable" animation (the little shake) if the hand gets closed mid-animation and then re-opened.
94. Deselecting a combat page, but keeping one's mouse hovering over said page, keeps the page above its neighbors. Moving your mouse away and back fixes this.
95. Quitting to menu while in the middle of the "reception won" or "reception lost" animation, then entering another reception afterwards, immediately ends the reception as though it were the previous reception.
96. Unused defensive dice don't retain on kill during a clash.
97. Unused defensive dice get rolled during a clash.
98. "All Characters" abnormality pages do not carry over to new enemies.
    - Usually a new act, but also applies to enemies spawned in, e.g., during a realization.

# Sources

Thanks to CountDuckoo and Cya for their bug documentation, bugfix mod, and general Ruina knowledge for helping me compile this list

