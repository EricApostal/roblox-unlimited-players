# Roblox Unlimited Players
Reimplementation of Roblox's Multiplayer via MessageService

# About
This idea spawned out of a concept for a Roblox game that could handle unlimited players per game. Unfortunately, this game is broken due to changes in MessageService rate limits.

[MessagingService](https://create.roblox.com/docs/reference/engine/classes/MessagingService) is a new-ish service on Roblox that allows for cross-server broadcasting. It's often used for server browsers and features of that nature, however, its original state allowed for enough packet throughput to send player positions. This system works by caching player positions every ~2 game ticks, Base64 encoding them, and broadcasting it to every running server. I then replicated every player across every running server, which allowed for functionally unlimited players.

# Completed Tasks
- Full Movement Replicated
- Chat Replication

# Future Tasks
- Rework to work with new MessagingService limitations
- Localize movement replication to attached part
- Optimize networking/replication when far away

# Limitations
![image](https://github.com/EricApostal/roblox-unlimited-players/assets/60072374/38953c78-d216-477b-b57c-36b5765d6a75)

While this was a really cool project, I can't continue with it as I am currently doing it, as Roblox now prevents too many requests from being sent. According to the new network limitations, there are a maximum number of received messages, which is a linearly allocated constraint. This can't work in the current system, as the number of packets sent is a `y = x^2` relationship. I am currently drafting the network infrastructure to handle this via my own webserver, and I play on rewriting the cross-server communication element of this.
