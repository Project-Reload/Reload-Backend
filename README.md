# Reload Backend

![Imgur](https://imgur.com/L06O0IJ.png)

Reload Backend is a universal Fortnite private server backend written in [JavaScript](https://en.wikipedia.org/wiki/JavaScript)

Created by [Burlone](https://github.com/burlone0), This is a modded backend, all main backend credits to [Lawin](https://github.com/Lawin0129)

Challenges contributed by [NotTacos](https://github.com/PhysicalDrive)

## Features
* Locker:
    * [x] Changing items.
    * [x] Changing banner icon and banner color.
    * [x] Changing item edit styles.
    * [x] Favoriting items.
    * [x] Marking items as seen.
* Friends:
    * [x] Adding friends.
    * [x] Accepting friend requests.
    * [x] Removing friends.
    * [x] Blocking friends.
    * [x] Setting nicknames.
    * [x] Removing nicknames.
* Item Shop:
    * [x] Customizable Item Shop.
    * [x] Purchasing items from the Item Shop.
    * [x] Gifting items to your friends.
    * [x] Working Auto Item Shop (In Beta).
* Discord Bot:
    * [x] Being able to activate/deactivate the Discord bot.
    * [x] Commands with very useful functions.
* BattlePass (s2-s13):
    * [x] Possibility to buy the battle pass.
    * [x] Possibility to purchase battle pass levels.
* Challenges:
    * [x] Daily missions worked (Backend Part).
    * [x] Working weekly missions (Backend Part).
* SAC (Support A Creator):
    * [x] It supports a supported creator, you can set it using the `/createsac {code} {ingame-username}` command on discord.
    * [x] Rewards in vbucks for those who support a creator.
* Matchmaker:
    * [x] An improved matchmaker.
* Website:
    * [x] A simple website where you can create an account to join the game.
### XMPP Features
- Parties (builds 3.5 to 14.50).
- Chat (whispering, global chat, party chat).
- Friends.

## TO-DO
- [ ] New supported battle passes to be added (s14 and later)
- [ ] Create a support with save the world

## Discord Bot Commands
### User Commands:
- `/create {email} {username} {password}` - Creates an account on the backend (You can only create 1 account).
- `/details` - Retrieves your account info.
- `/lookup {username}` - Retrieves someones account info.
- `/exchange-code` - Generates an exchange code for login. (One time use for each code and if not used it expires after 5 mins).
- `/change-username {newUsername}` - You can change your username using this command.
- `/change-email {newEmail}` - You can change your email using this command.
- `/change-password {newPassword}` - You can change your password using this command.
- `/sign-out-of-all-sessions` - Signs you out if you have an active session.
- `/vbucksamount` - Shows how many vbucks to the user
- `/claimvbucks` - Claim your daily {idk the default is 250} V-Bucks
### Admin Commands:
- You can only use the admin commands if you are a moderator.
- `/addall {user}` - Allows you to give a user all cosmetics. Note: This will reset all your lockers to default
- `/addvbucks {user} {vbucks}` - Lets you change a users amount of vbucks
- `/additem {user} {cosmeticname}` - The name of the cosmetic you want to give
- `/ban {targetUsername}` - Ban a user from the backend by their username.
- `/createsac {code} {ingame-username}` - Creates a Support A Creator Code.
- `/delete {username}` - Deletes a users account
- `/kick {targetUsername}` - Kick someone out of their current session by their username.
- `/removevbucks {user} {vbucks}` - Lets you change a users amount of vbucks
- `/removeitem {user} {cosmeticname}` - Allows you to remove a cosmetic (skin, pickaxe, glider, etc.) from a user
- `/unban {targetUsername}` - Unban a user from the backend by their username.
### How to set up moderators?
1) Go to Config/config.json in the directory you extracted Reload Backend into.
2) Open it, you should see a "moderators" section in the file.
3) You have to get your discord id and replace discordId with it.
4) You can set multiple moderators like this `["discordId","discordId2"]`.
### How to setup multiple gameservers
1) Go to Config/config.json in the directory you extracted Reload Backend into.
2) Open it, you should see a "gameServerIP" section in the file.
3) To add more gameservers you will have to do it like this `"gameServerIP": ["127.0.0.1:7777:playlist_defaultsolo:eu", "127.0.0.1:7777:playlist_defaultduo:eu"],`
4) You have now added solos and duos to your matchmaking 
## How to start Reload Backend
1) Install [NodeJS](https://nodejs.org/en/) and [MongoDB](https://www.mongodb.com/try/download/community).
2) Download and Extract Reload Backend to a safe location.
3) Run "install_packages.bat" to install all the required modules.
4) Go to Config/config.json in the directory you extracted Reload Backend into.
5) Open it, set your discord bot token (DO NOT SHARE THIS TOKEN) and save it. The discord bot will be used for creating accounts and managing your account (You can disable the discord bot by entering "bUseDiscordBot" to false in "Config/config.json").
6) Run "start.bat", if there is no errors, it should work.
7) Use something to redirect the Fortnite servers to localhost:8080 (Which could be fiddler, ssl bypass that redirects servers, etc...)
8) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an exchange code) then press login. It should let you in and everything should be working fine.

## Credits
### Credits to:
* [Lawin](https://github.com/Lawin0129) - For the backend base (LawinServerV2)
* [Burlone](https://github.com/burlone0) - For having modded most things, let's say he modded everything
* [NotTacos](https://github.com/PhysicalDrive) - For adding the working challenges (Backend Part)
* [zvivsp](https://github.com/zvivsp) - For creating the graphics
* [joaco](https://github.com/ojotaa0124) - For helping with CloudStorage and responses stuff
* [nade](https://github.com/gn1e) - For creating Auto Item Shop (Even if [Burlone](https://github.com/burlone0) solved many problems heheheh)
