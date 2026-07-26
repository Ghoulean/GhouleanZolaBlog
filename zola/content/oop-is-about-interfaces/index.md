+++
title = "You must be this tall to OOP"
description = "You don't (necessarily) need OOP and here's why"
date = 2025-06-15T15:00:00Z
draft = true

[taxonomies]
tags = ["oop"]
[extra]
toc = true
+++

- oop is about interfaces in your code: how one **module** (component) interacts with another
  - abstraction, encapsulation, inheritance, polymorphism
- but a lot of features in OOP are massive footguns -- e.g. a lot of advice around inheritance (the defining characteristic of OOP) is "dont do it"
  - if you want polymorphism+abstraction+encapsulation we have traits which is infinitely better
- OOPbrain makes structs very weird -- all getters and setters for reasons unclear
- basically the only advantage for OOP i can think of is that OOP is microservices for monoliths

- what

- lets rundown the pros cons of microservices:
- pros:
  - **allows team ownership of components**
  - independent scaling on a per-component basis
  - (mostly) fault isolation if you've structured ur service right
 - cons:
  - **pre-emptively defines an abstraction over how components interact with each other rather than creating one when needed**
     - multiple abstractions are valid for one usecase, but there may be only one abstraction appropriate for all of our usecases