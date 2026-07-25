require('dotenv').config();

function bool(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

function num(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return Number(raw);
}

function str(key, fallback) {
  const raw = process.env[key];
  return raw === undefined ? fallback : raw;
}

function arr(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw.split(',').map((item) => item.trim());
}

const websitePort = num('WEBSITE_PORT', 100);

const config = {
  moderators: arr('MODERATORS', []),

  discord: {
    bUseDiscordBot: bool('DISCORD_USE_BOT', true),
    bot_token: str('DISCORD_BOT_TOKEN', ''),
    bEnableInGamePlayerCount: bool('DISCORD_ENABLE_INGAME_PLAYER_COUNT', true),
  },

  mongodb: {
    database: str('MONGODB_DATABASE', 'mongodb://127.0.0.1/Reload'),
  },

  chat: {
    EnableGlobalChat: bool('CHAT_ENABLE_GLOBAL_CHAT', false),
  },

  bEnableDebugLogs: bool('ENABLE_DEBUG_LOGS', false),
  bEnableFormattedLogs: bool('ENABLE_FORMATTED_LOGS', false),
  bEnableRebootUser: bool('ENABLE_REBOOT_USER', true),
  bEnableCrossBans: bool('ENABLE_CROSS_BANS', false),

  port: num('PORT', 3551),
  xmppPort: num('XMPP_PORT', 80),
  xmppPortHTTPS: num('XMPP_PORT_HTTPS', 443),

  Api: {
    bApiKey: str('API_KEY', 'ur-api-key'),
    reasons: {
      Kill: num('API_REASON_KILL', 25),
      Win: num('API_REASON_WIN', 50),
    },
  },

  Website: {
    bUseWebsite: bool('WEBSITE_USE_WEBSITE', false),
    clientId: str('WEBSITE_CLIENT_ID', 'your-client-id-here'),
    clientSecret: str('WEBSITE_CLIENT_SECRET', 'your-client-secret-here'),
    websitePort: websitePort,
    redirectUri: str(
      'WEBSITE_REDIRECT_URI',
      'http://127.0.0.1:${websitePort}/oauth2/callback'
    ).replace('${websitePort}', websitePort),
  },

  matchmakerIP: str('MATCHMAKER_IP', '127.0.0.1:80'),
  gameServerIP: arr('GAME_SERVER_IP', ['127.0.0.1:7777:playlist_defaultsolo']),

  bEnableBattlepass: bool('ENABLE_BATTLEPASS', false),
  bBattlePassSeason: num('BATTLEPASS_SEASON', 2),

  bEnableOnlyOneVersionJoinable: bool('ENABLE_ONLY_ONE_VERSION_JOINABLE', false),
  bVersionJoinable: num('VERSION_JOINABLE', 2),

  bUseAutoRotate: bool('USE_AUTO_ROTATE', false),
  bEnableAutoRotateDebugLogs: bool('ENABLE_AUTO_ROTATE_DEBUG_LOGS', false),
  bEnableDiscordWebhook: bool('ENABLE_DISCORD_WEBHOOK', false),
  bChapterlimit: str('CHAPTER_LIMIT', '1'),
  bSeasonlimit: str('SEASON_LIMIT', '10'),
  bRotateTime: str('ROTATE_TIME', '00:00'),
  bExcludedItems: arr('EXCLUDED_ITEMS', [
    'CID_VIP_Athena_Commando_M_GalileoGondola_SG',
    'CID_636_Athena_Commando_M_GalileoGondola_78MFZ',
    'CID_637_Athena_Commando_M_GalileoOutrigger_7Q0YU',
    'CID_VIP_Athena_Commando_M_GalileoFerry_SG',
    'CID_VIP_Athena_Commando_F_GalileoRocket_SG',
    'CID_568_Athena_Commando_M_RebirthSoldier',
  ]),
  bItemShopWebhook: str('ITEM_SHOP_WEBHOOK', ''),
  bDailyItemsAmount: num('DAILY_ITEMS_AMOUNT', 6),
  bFeaturedItemsAmount: num('FEATURED_ITEMS_AMOUNT', 2),

  bEnableReports: bool('ENABLE_REPORTS', false),
  bReportChannelId: str('REPORT_CHANNEL_ID', 'your-discord-channel-id-here'),

  bCompletedSeasonalQuests: bool('COMPLETED_SEASONAL_QUESTS', false),

  bEnableSACRewards: bool('ENABLE_SAC_REWARDS', false),
  bPercentageSACRewards: num('PERCENTAGE_SAC_REWARDS', 0),

  bEnableAutoBackendRestart: bool('ENABLE_AUTO_BACKEND_RESTART', false),
  bRestartTime: str('RESTART_TIME', ''),

  bEnableBackendStatus: bool('ENABLE_BACKEND_STATUS', false),
  bBackendStatusChannelId: str('BACKEND_STATUS_CHANNEL_ID', ''),

  bEnableHTTPS: bool('ENABLE_HTTPS', false),
  ssl: {
    cert: str('SSL_CERT', './ssl/example_certificate.crt'),
    key: str('SSL_KEY', './ssl/example_private.key'),
  },

  bEnableCalderaService: bool('ENABLE_CALDERA_SERVICE', false),
  bGameVersion: str('GAME_VERSION', '27.11'),
  bCalderaServicePort: num('CALDERA_SERVICE_PORT', 5000),

  bEnableGeodeEvent: bool('ENABLE_GEODE_EVENT', false),
  geodeEventStartDate: str('GEODE_EVENT_START_DATE', '2020-01-01T00:00:00.000Z'),
  bEnableCrackInTheSky: bool('ENABLE_CRACK_IN_THE_SKY', false),
  bEnableS4OddityPrecursor: bool('ENABLE_S4_ODDITY_PRECURSOR', false),
  bEnableS4OddityExecution: bool('ENABLE_S4_ODDITY_EXECUTION', false),
  S4OddityEventStartDate: str('S4_ODDITY_EVENT_START_DATE', '2020-01-01T00:00:00.000Z'),
  S4OddityEventsInterval: num('S4_ODDITY_EVENTS_INTERVAL', 0),
  bEnableS5OddityPrecursor: bool('ENABLE_S5_ODDITY_PRECURSOR', false),
  S5OddityPrecursorDate: str('S5_ODDITY_PRECURSOR_DATE', '2020-01-01T00:00:00.000Z'),
  bEnableS5OddityExecution: bool('ENABLE_S5_ODDITY_EXECUTION', false),
  S5OddityExecutionDate: str('S5_ODDITY_EXECUTION_DATE', '2020-01-01T00:00:00.000Z'),
  bEnableCubeLightning: bool('ENABLE_CUBE_LIGHTNING', false),
  cubeSpawnDate: str('CUBE_SPAWN_DATE', '2020-01-01T00:00:00.000Z'),
  bEnableBlockbusterRiskyEvent: bool('ENABLE_BLOCKBUSTER_RISKY_EVENT', false),
  bEnableCubeLake: bool('ENABLE_CUBE_LAKE', false),
  cubeLakeDate: str('CUBE_LAKE_DATE', '2020-01-01T00:00:00.000Z'),
};

module.exports = config;