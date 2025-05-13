+++
title = "Explaining the Long-Short Portfolio"
description = "Despite consistently underperforming the market, some actively managed funds have their upsides"
date = 2025-05-12T15:00:00Z
draft = true

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
4. Return the investment to your lender[^1]

Between steps 2 and 3, there's a brief window where you're holding onto a pile of money. Instead of doing nothing, you can turn around and use that money to purchase a long position. This results in an interesting phenomenon where you start out with $0 and end up with $0 plus two open investments[^2].

If you picked your stocks right, your long position goes up and your short position goes down. You cash in your long in order to buy back and return your short. Now you've ended up with a profit despite starting from literally nothing.

This is basically a free money hack.

# Return On Investment (ROI)

Return on investment (ROI) is how much you earn from an investment relative to its cost, and usually measured in percentages. Generally speaking, ROI doesn't change regardless of how much money you put in[^3] [^4], so in absolute dollar terms your earnings scale linearly based on how much money you put in.

For example, let's say the ROI of a certain stock is 10%. If you put in $100, you will earn $10 in profit. If you put in $1,000, you will earn $100 in profit.

But in the long-short portfolio, our starting money is $0, and we earn $`x` in profit. If we want to increase our earnings tenfold to $`10x`, we put in ten times the amount of money, which is still zero. And we can keep going as far as we want to take it.

Our free money hack is actually an *infinite* free money hack.

# Other Fun Things

 - Since you've put in $0, you can run a long-short portfolio alongside your other, presumably more sane investments (such as VT and chill)
 - In large market downswings (and upswings), your short positions hedge against your long positions (and vice versa). You're still probably going to be losing (and earning) money, but not as much and as badly as investments that ride on the market.

# Important Caveats You Should Know Before You Go And Bankrupt Yourself

- You need to not only pick stocks that go up, but also stocks that go down. At minimum, this is twice as difficult as only picking stocks that go up, which is already basically impossible.

 - You have zero cushion in case you mess up (which, let's be real, is not a matter of *if* but more a matter of *when* and *how badly*). In sane portfolios such as VT and chill, the worst that could happen is that you lose all your money. In a long-short, your infinite money hack could easily become an infinite money hole.

-----

[^1]: Plus borrowing and transaction fees, but I'm going to ignore that.

[^2]: Realistically, you'll want to start with a little more than $0 to give yourself a bit of elbow room.

[^3]: Um, actually, there is an upper limit. Obtaining a large enough ownership of a company will eventually affect the stock price itself. But for companies in the S&P 500, "too much" is roughly $60MM at minimum, so there’s quite a bit of leeway.

[^4]: There's also a lower limit where frictional costs such as transaction fees and interest eat up all your gains. Some investments such as real estate may also demand a down payment (or other similar upfront costs) as a buy-in.
