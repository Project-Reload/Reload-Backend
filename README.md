# Reload Backend

![Imgur](https://i.imgur.com/ImIwpRm.png)

Reload Backend is a universal Fortnite private server backend written in [JavaScript](https://en.wikipedia.org/wiki/JavaScript)

Created by [Burlone](https://github.com/burlone0), This is a modded backend, all main backend credits to [Lawin](https://github.com/Lawin0129)

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
    * [x] Working Auto Item Shop.
* Refunding:
    * [x] Working refunding stuff.
* Discord Bot:
    * [x] Being able to activate/deactivate the Discord bot.
    * [x] Commands with very useful functions.
* BattlePass (s2-s20):
    * [x] Possibility to buy the battle pass.
    * [x] Possibility to purchase battle pass levels.
    * [x] Possibility to gift the battle pass (BETA).
* Challenges (Backend Part):
    * [x] Daily missions worked.
    * [x] Working weekly missions.
    * [x] You can replace daily quests.
    * [x] You can get help from your party to complete missions.
* In-Game Events:
    * [x] You will be able to activate various events that occurred in the game such as the rift in the sky and much more!
* Winterfest Event (11.31, 19.01, 23.10, 33.11):
    * [x] The winterfest event should work with all its rewards!
* SAC (Support A Creator):
    * [x] It supports a supported creator, you can set it using the `/createsac {code} {ingame-username}` command on discord.
    * [x] Rewards in vbucks for those who support a creator.
* Matchmaker:
    * [x] An improved matchmaker.
* Multiple Gameserver Support:
    * [x] An improved multiple gameserver.
* Website:
    * [x] A simple website where you can create an account to join the game.
* XMPP:
    * [x] Parties.
    * [x] Chat (whispering, global chat, party chat).
    * [x] Friends.
* HTTPS/SSL Support:
    * [x] A working https/ssl system.

## TO-DO
- [ ] Differentiate ports between xmpp and matchmaker
- [ ] Create a support with save the world
- [ ] Create a support with creative

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
- `/giftvbucks {username}` - Send another user your V-Bucks.
- `/claimvbucks` - Claim your daily {idk the default is 250} V-Bucks
### Admin Commands:
- You can only use the admin commands if you are a moderator.
- `/addall {user}` - Allows you to give a user all cosmetics. Note: This will reset all your lockers to default
- `/addvbucks {user} {vbucks}` - Lets you change a users amount of vbucks
- `/additem {user} {cosmeticname}` - The name of the cosmetic you want to give
- `/create-custom-match-code {code} {ip} {port}` - Create a custom matchmaking code.
- `/ban {targetUsername}` - Ban a user from the backend by their username.
- `/createhostaccount` - Creates a host account for Reload Backend.
- `/createsac {code} {ingame-username}` - Creates a Support A Creator Code.
- `/custom-match-code-list` - Lists all custom matchmaking codes.
- `/delete {username}` - Deletes a users account
- `/deletediscord {username}` - Deletes a users account
- `/deletesac {username}` - Deletes a Support A Creator Code.
- `/kick {targetUsername}` - Kick someone out of their current session by their username.
- `/removevbucks {user} {vbucks}` - Lets you change a users amount of vbucks
- `/removeitem {user} {cosmeticname}` - Allows you to remove a cosmetic (skin, pickaxe, glider, etc.) from a user
- `/unban {targetUsername}` - Unban a user from the backend by their username.

>[!IMPORTANT]
>**Note:** `.env` is an override file, not a full config. Only put the configuration values you want to change in there. `.env.example` & `Config/config.js` already specify all of the default options.

### How to set up moderators?
1) Go to/Create **.env** in the directory you extracted Reload Backend into.
2) Open it, it will either be blank or have your custom config if you already added some config options.
3) Get your moderator's discord IDs
4) Add them to the file like this `MODERATORS=discordId,discordId2`.
<sub>P.S: you can add only one moderator, or multiple, if you want. They must all however be on the same line. You cannot have multiple `MODERATORS` lines.</sub>

### How to setup multiple gameservers
1) Go to **.env** in the directory you extracted Reload Backend into.
2) Open it, you should see a **GAME_SERVER_IP** line in the file.
3) To add more gameservers you will have to do it like this `GAME_SERVER_IP=127.0.0.1:7777:playlist_defaultsolo,127.0.0.1:7777:playlist_defaultduo`
4) You have now added solos and duos to your matchmaking

### How to set up the Discord bot
1) Go to/Create **.env** in the directory you extracted Reload Backend into.
2) Open it, it will either be blank or have your custom config if you already added some config options.
3) Get your Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications) **(DO NOT SHARE THIS TOKEN)**.
4) Add it to the file like this `DISCORD_BOT_TOKEN=your-bot-token-here`.
<sub>P.S: if you don't want the Discord bot to run at all, set `DISCORD_USE_BOT=false` instead, and you can skip getting a token.</sub>

>[!IMPORTANT]
>It is recommended, but not required, that you run your backend on the same machine you play Fortnite on.
>If you are trying to host multiple people, it is recommeneded to use a VPS and Linux, but it is not required to use Linux. Depending on the provider, a VPS can also run Windows if you do not want to use Linux.

## How to start Reload Backend on Windows
1) Install [NodeJS](https://nodejs.org/en/) and [MongoDB](https://www.mongodb.com/try/download/community).
2) **Download** and **Extract** Reload Backend to a safe location.
3) Run **"install_packages.bat"** to install all the required modules.
4) Go to/Create **.env** in the directory you extracted Reload Backend into. This file only needs the options you want to change from default, not every value found in `.env.example`.
5) Set up the Discord bot (see [How to set up the Discord bot](#how-to-set-up-the-discord-bot)), or set `DISCORD_USE_BOT=false` if you don't want to use it.
6) Run **"start.bat"**, if there is no errors, it should work.
7) Use something to redirect the Fortnite servers to **localhost:3551** or whatever IP your backend is running on (Which could be fiddler, ssl bypass that redirects servers, etc...)
8) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an exchange code) then press login. It should let you in and everything should be working fine.

## How to start Reload Backend on Linux
>[!IMPORTANT]
>Fortnite is natively ran on Windows. At the time of writing this, there is no way to play Fortnite on Linux.
>This is only if you do not want to host your backend on a Windows machine.
1) Install [NodeJS](https://nodejs.org/en/), [MongoDB](https://www.mongodb.com/try/download/community) and `git`.
2) In your home directory, or any other directory that you wish, run this command: `git clone https://github.com/Project-Reload/Reload-Backend`
3) Then, do `cd Reload-Backend` to enter the directory.
4) Run `npm i` (this will also work with `pnpm` if you prefer that)
5) Go to/Create **.env** in the directory you extracted Reload Backend into. This file only needs the options you want to change from default, not every value found in `.env.example`.
6) Set up the Discord bot (see [How to set up the Discord bot](#how-to-set-up-the-discord-bot)), or set `DISCORD_USE_BOT=false` if you don't want to use it.
7) Run `npm start` to start the backend (again, thiswill also work with `pnpm`)
8) Use something to redirect the Fortnite servers to **<your linux machines IP>:3551** or whatever port you specified in `.env` (Which could be fiddler, ssl bypass that redirects servers, etc...)
9) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an exchange code) then press login. It should let you in and everything should be working fine.

## Caldera Service
Recreates a service that is used for the startup of newer Fortnite builds.

### For login
You need to use the **FortniteLauncher.exe** and with that also the **Anti Cheat**

If you use [Fiddler](https://www.telerik.com/download/fiddler) you can use this script:

```
import Fiddler;

class Handlers
{
    static function OnBeforeRequest(oSession: Session) {

        if (oSession.PathAndQuery.Contains("/caldera/api/v1/launcher/racp"))
        {
            if (oSession.HTTPMethodIs("CONNECT"))
            {
                oSession["x-replywithtunnel"] = "ServerTunnel";
                return;
            }
            oSession.fullUrl = "http://127.0.0.1:5000" + oSession.PathAndQuery
        }
        if (oSession.hostname.Contains("epicgames"))
        {
            if (oSession.HTTPMethodIs("CONNECT"))
            {
                oSession["x-replywithtunnel"] = "ServerTunnel";
                return;
            }
            oSession.fullUrl = "http://127.0.0.1:3551" + oSession.PathAndQuery
        }
    }
}
```

if u change **Caldera Service port** modify this string on **fiddler script**: `oSession.fullUrl = "http://127.0.0.1:urport" + oSession.PathAndQuery`
if u change **Backend port** modify this string on **fiddler script**: `oSession.fullUrl = "http://127.0.0.1:urport" + oSession.PathAndQuery`

After that go to the build folder **(/FortniteGame/Binaries/Win69)** and create a file with the name **launch.bat** or whatever you prefer and insert this code inside it:

```bat
@echo off
set /p code=code: 
start "" "FortniteLauncher.exe" -obfuscationid=WXis54njnKX1MJqoH0uRwdzlbQ1uqQ -AUTH_LOGIN=unused -AUTH_PASSWORD=%code% -AUTH_TYPE=exchangecode -epicapp=Fortnite -epicenv=Prod -EpicPortal -epicsandboxid=fn -noeac -noeaceos -fromfl=be 
```

Launch it, then go to Discord and type **/exchange-code**, copy the code and paste it into the .bat file.

### Tested versions: 
Right now the only tested version is **27.11**, if you test version, have questions or anything please make a ticket or a pull request [In the official repo](https://github.com/xLoigi/CalderaService).

## License
This **project/backend** is licensed under the **BSD 3-Clause License.**

## Disclaimer
All **Fortnite OG** related projects named **Project Reload**, **Reload**, **Reload Backend** or using **our official images** are not owned or affiliated with us. Please do not trust and report them via discord to **burlone413**. All rights are licensed to [burlone0](https://github.com/burlone0)

## Credits
Credits have been moved to the **Contributors** section of github. If I forgot to include someone, write to **burlone413** on Discord

---

**Reload Backend** is under continuous development and there could be errors of any kind, if you want to give advice on what to add and how to improve the project or report any errors you can do so by writing to **burlone413** on Discord
