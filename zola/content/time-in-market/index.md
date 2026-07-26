+++
title = "The Cost of Saving Late"
description = "How much does saving 10 years late really cost you?"
date = 2025-06-15T15:00:00Z
draft = true

[taxonomies]
tags = ["finance"]
[extra]
toc = true
+++

The other day I heard an interesting factoid: saving and investing between ages 20-30 is the same as saving and investing between the ages of 30-60. At the time I nodded my head and pumped my fists in the air, but the more I thought about it the less sense it made. Surely, you'd overtake at 50 years or so?

// TODO: set up interactive widgets? requires using shortcodes + writing javascript. Or just update the Python notebook. sounds like a chore

This is a fairly simple thing to calcuate. Suppose you save roughly $43 per month; this is the US minimum wage ($7.25/h), minus taxes (comes out to roughly ~$530/mo), multiplied by the average US savings rate (4%). Also suppose that the stock market averages 6% in returns year by year; this is the conservative estimate I use for my own personal finance decisions.

Crunching the numbers, you indeed see that working until your 60s outpaces working until 30 when you are around 57 years old (443 months = 36 years + 11 months) (image 1)
--
That's cool and all, but what about actual historical data? Surely the dot com bubble, 2008 housing crisis, and COVID would have absolutely wrecked the savings of the guy (gender neutral) who retired at 30? And surely, your career advancement in your 40s and 50s would outpace the stock market?

Well, instead of 6%, I substituted in historical stock market return data, and instead of minimum wage, I used the 2023 *nominal* historical *per capita* income table from the US Census Bureau. When you use these numbers, simulating the economic environment from 1980 to 2020, you'll find that the late saver never manages to catch up, ever, and it's not even close (image 2)
