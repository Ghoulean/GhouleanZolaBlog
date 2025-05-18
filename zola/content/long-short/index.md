+++
title = "Explaining the Long-Short Portfolio"
description = "Despite consistently underperforming the market, some actively managed funds have their upsides"
date = 2025-05-17T15:00:00Z
draft = false

[taxonomies]
tags = ["finance"]
[extra]
toc = true
+++

Despite consistently underperforming the market, some actively managed funds have their upsides.

# The Basics

"Going long" means that you buy a stock when it's low (hopefully), and intend to sell later when it's high (hopefully). "Shorting" a stock is the opposite: you bet that the stock goes down. Mechanically:

1. Borrow an investment
2. Immediately sell it
3. Later, buy the investment back
4. Return the investment to your lender

Between steps 2 and 3, there's a brief window where you're holding onto a pile of money. Instead of doing nothing, you can turn around and use that money to purchase a long position. This results in an interesting phenomenon where you start out with $0 and end up with $0 plus two open investments.

If you picked your stocks right, your long position goes up and your short position goes down. You cash in your long in order to buy back and return your short. Now you've ended up with a profit despite starting from literally nothing.

This is basically a free money hack.

# Return On Investment

Return on investment (ROI) is how much you earn from an investment relative to its cost, and usually measured in percentages. Up to a limit, ROI doesn't change regardless of how much money you put in, so in absolute dollar terms your earnings scale linearly based on how much money you put in.

For example, let's say the ROI of a certain stock is 10%. If you put in $100, you will earn $10 in profit. If you put in $1,000, you will earn $100 in profit.

But in the long-short portfolio, our starting money is $0, and we earn $`x` in profit. If we want to increase our earnings tenfold to $`10x`, we put in ten times the amount of money, which is still $0. And we can keep going as far as we want to take it.

Our free money hack is actually an *infinite* free money hack.

# Important Caveats

 - If it sounds too good to be true, it is. I simplified the mechanisms of long-shorts to make the explanation short and easily digestable, but I also skipped over the parts about active investing that's actually difficult, such as price discovery, valuation, etc. You can't vibe your way through this.
 - All the extra time and effort you need to put in to ensure your homebrew active fund doesn't immediately get driven off a cliff makes the investment not "free". Passive investments, such as VT and chill, earn their keep by making money with no input from you.
 - You need to not only pick stocks that go up, but also stocks that go down. At minimum, this is twice as difficult as only picking stocks that go up, which is already basically impossible.
 - Since you're running in with $0, you have zero cushion in case you mess up. (And let's be honest, you *will* mess up. It's not a matter of *if* but more a matter of *when* and *how badly*.) In sane portfolios such as VT and chill, the worst that could happen is that you lose all your money. In a long-short, your infinite free money hack could easily become an infinite money spiral of doom.

# Other Fun Things

 - Since your active fund is "free" (in the sense that, money-wise, there's no opportunity cost), you can run a long-short portfolio alongside your other, presumably more sane investments (such as VT and chill)
 - In large market downswings (and upswings), your short positions hedge against your long positions (and vice versa). As a result, although you'll still lose (or earn) money due to the market, you'll lose (and earn) less money.

