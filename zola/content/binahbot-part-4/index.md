+++
title = "How BinahBot Works - Part 4"
description = "Infrastructure: the hardware and associated cost of hosting and running BinahBot."
date = 2025-03-15
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

By the way, although AWS is one of if not the best cloud compute service in the world, it is still very easy to shoot yourself in the foot and lose hundreds of dollars by accidentally leaving an instance on for like two days. If you're an excited newbie programmer who wants to replicate what I'm doing, I urge you to talk to a knowledgable source before proceeding with your own project. Spending money on cool tech doesn't make you a good software developer.

## CI/CD

CI/CD means whenever I push my code to GitHub, the new code automatically gets built and deployed to production. CI/CD is awesome. What it stands for doesn't matter.

Earlier in this article, I mentioned that I use AWS to host my infrastructure. You might think I go to Amazon.com and click a bunch of buttons on a dashboard to spin up a bunch of virtual machines in their data warehouses. I could do that, but there's a better way. AWS offers a service known as CloudFormation, which lets me upload a template that spins up all the infrastructure I want. Furthermore, AWS offers a library known as the AWS CDK ("Cloud Development Kit", written in Javascript and Typescript), which lets me write that template in code rather than as a JSON file, and also build and deploy that automatically.

As an analogy, let's say I want to build a house. "Clicking a bunch of buttons on the AWS dashboard" is like figuring out the design as I lay down the bricks. CloudFormation is like being handed a blueprint before starting a build. CDK is like using AutoCAD to help design and draw the blueprint.

In any case. CDK is awesome. CloudFormation is awesome.

Now that both my infrastructure and BinahBot are technically both code, I can push both to Github and automatically deploy both infrastructure and application code at the same time, automatically. The next thing to tackle is to set up that mechanism.

I've previously used Github Actions to trigger CI/CD workflows -- this blog, in fact, uses Github Actions to push all my blog updates live. But for BinahBot, I tried something different: CircleCI.

I have no idea why I didn't at least attempt using AWS CodePipeline. (Given how much of AWS I'm using already, it should be the default choice.) And honestly I kind of regret using CircleCI. Their free tier restrictions are kinda weird. Every time I deploy I use up a decent amount of storage and that apparently goes against some quota that I still don't understand.

{{ img(src="./circleci_quota.png" class="ci b1") }}

It's fine given that I don't really push much updates on BinahBot often anymore as it's quite mature by now. Despite my grievances against CircleCI, it still *works*. I think switching to another CI/CD solution would take a lot more work in exchange for basically no visible effect.

# Appendix

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
