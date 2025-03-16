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
### How to set up moderators?
1) Go to **Config/config.json** in the directory you extracted Reload Backend into.
2) Open it, you should see a **"moderators"** section in the file.
3) You have to get your discord id and replace discordId with it.
4) You can set multiple moderators like this `["discordId","discordId2"]`.
### How to setup multiple gameservers
1) Go to **Config/config.json** in the directory you extracted Reload Backend into.
2) Open it, you should see a **"gameServerIP"** section in the file.
3) To add more gameservers you will have to do it like this `"gameServerIP": ["127.0.0.1:7777:playlist_defaultsolo", "127.0.0.1:7777:playlist_defaultduo"],`
4) You have now added solos and duos to your matchmaking 

## How to start Reload Backend
1) Install [NodeJS](https://nodejs.org/en/) and [MongoDB](https://www.mongodb.com/try/download/community).
2) **Download** and **Extract** Reload Backend to a safe location.
3) Run **"install_packages.bat"** to install all the required modules.
4) Go to **Config/config.json** in the directory you extracted Reload Backend into.
5) Open it, set your discord bot token **(DO NOT SHARE THIS TOKEN)** and **save it**. The discord bot will be used for creating accounts and managing your account (You can disable the discord bot by entering "bUseDiscordBot" to false in "Config/config.json").
6) Run **"start.bat"**, if there is no errors, it should work.
7) Use something to redirect the Fortnite servers to **localhost:8080** (Which could be fiddler, ssl bypass that redirects servers, etc...)
8) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an exchange code) then press login. It should let you in and everything should be working fine.

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

## Credits
Credits have been moved to the **Contributors** section of github. If I forgot to include someone, write to **burlone413** on Discord

---

**Reload Backend** is under continuous development and there could be errors of any kind, if you want to give advice on what to add and how to improve the project or report any errors you can do so by writing to **burlone413** on Discord