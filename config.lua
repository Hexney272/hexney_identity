Config = {}

-----------------------------------------------------------
-- BRANDING
-----------------------------------------------------------
-- Top text shown on the identity card.
Config.Brand      = 'HEXNEY'
Config.SubBrand   = 'CITIZEN'

-----------------------------------------------------------
-- KEYBIND / BEHAVIOUR
-----------------------------------------------------------
-- 'hold'   -> the card is visible only while the key is held down (GTA Online style)
-- 'toggle' -> press once to open, press again to close
Config.Mode       = 'hold'

-- Default key. Players can rebind it in FiveM settings > Key Bindings.
-- 'LMENU' = Left ALT.  Other examples: 'TAB', 'F2', 'CAPITAL'
Config.DefaultKey = 'LMENU'

-- How often (ms) the live data refreshes while the card is open.
Config.RefreshRate = 1000

-- How often (ms) the online-player panel refreshes while open.
Config.OnlineRefreshRate = 5000

-- How often (ms) the microphone state is polled while open.
Config.VoicePollRate = 120

-----------------------------------------------------------
-- STATUS SOURCES
-----------------------------------------------------------
-- esx_status status names used for hunger / thirst.
-- Set to false to hide that ring entirely.
Config.HungerStatus = 'hunger'
Config.ThirstStatus = 'thirst'

-- Show health / armor rings.
Config.ShowHealth = true
Config.ShowArmor  = true

-----------------------------------------------------------
-- MONEY ACCOUNTS
-----------------------------------------------------------
-- ESX account names mapped to the two money rows.
Config.CashAccount = 'money'
Config.BankAccount = 'bank'
-- Currency symbol and thousands separator (Hungarian style by default).
Config.Currency        = '$'
Config.ThousandsSep    = '.'
Config.CurrencyAtEnd   = true   -- "125.000$" (true) vs "$125.000" (false)

-----------------------------------------------------------
-- JOB GROUPS
-----------------------------------------------------------
-- Each job in the game is mapped to one of these groups.
-- The matched group decides the UI accent color, the icon and the
-- bucket it counts towards in the online panel.
-- The 'order' controls the order they appear in the online panel.
-- Any job NOT listed in a group falls back to Config.DefaultGroup.
Config.DefaultGroup = 'civil'

Config.JobGroups = {
    police = {
        label = 'Police',
        icon  = 'POLICE',           -- short tag rendered in the online panel
        emoji = '\u{1F46E}',         -- 👮
        color = '#3b82f6',           -- blue
        order = 1,
        jobs  = { 'police', 'sheriff', 'bcso', 'sast', 'sahp', 'lspd' },
    },
    ems = {
        label = 'EMS',
        icon  = 'EMS',
        emoji = '\u{1F691}',         -- 🚑
        color = '#ef4444',           -- red
        order = 2,
        jobs  = { 'ambulance', 'ems', 'doctor', 'fire' },
    },
    mechanic = {
        label = 'Mechanic',
        icon  = 'MECH',
        emoji = '\u{1F527}',         -- 🔧
        color = '#f59e0b',           -- amber/yellow
        order = 3,
        jobs  = { 'mechanic', 'bennys', 'lscustoms', 'tuner' },
    },
    civil = {
        label = 'Civilian',
        icon  = 'CIV',
        emoji = '\u{1F9D1}',         -- 🧑
        color = '#e5e7eb',           -- soft white
        order = 99,
        jobs  = {},                   -- fallback group
    },
}

-----------------------------------------------------------
-- HELPERS (shared)
-----------------------------------------------------------
-- Returns the group key for a given job name.
function Config.GetGroupKey(jobName)
    if not jobName then return Config.DefaultGroup end
    jobName = string.lower(jobName)
    for key, group in pairs(Config.JobGroups) do
        for _, j in ipairs(group.jobs) do
            if string.lower(j) == jobName then
                return key
            end
        end
    end
    return Config.DefaultGroup
end


-----------------------------------------------------------
-- V2: LIVE PED RENDER
-----------------------------------------------------------
-- NUI (CEF) cannot read in-game textures, so the player's live 3D head
-- render is drawn natively with DrawSprite ON TOP of the NUI card, lined
-- up with the avatar slot. Tune the normalized screen position (0..1) so
-- it sits inside the avatar frame for your resolution / safezone.
Config.PedRender = {
    enabled = true,
    -- normalized screen coords (1920x1080 reference defaults)
    x = 0.158,   -- center X
    y = 0.330,   -- center Y
    w = 0.052,   -- width
    h = 0.092,   -- height
}

-----------------------------------------------------------
-- V2: HOURLY WAGE / EARNINGS
-----------------------------------------------------------
-- Shows how much the player earned this session and the extrapolated
-- hourly rate (cash + bank delta since the session started).
Config.ShowWage = true

-----------------------------------------------------------
-- V2: WEEKLY PLAYTIME
-----------------------------------------------------------
-- Server persists playtime per identifier in a weekly bucket.
Config.ShowWeekly      = true
Config.WeeklySaveRate  = 60      -- seconds between server-side playtime saves

-----------------------------------------------------------
-- V2: ACHIEVEMENTS
-----------------------------------------------------------
-- Generic, client-evaluated achievements. Each has a `check(ctx)` that
-- receives a context table and returns true once unlocked. Unlocks are
-- persisted server-side per identifier.
--
-- ctx fields available to check():
--   ctx.bank, ctx.cash, ctx.total      (money)
--   ctx.sessionSeconds                 (current session length)
--   ctx.weeklySeconds                  (this week, incl. live session)
--   ctx.jobGroup                       (police/ems/mechanic/civil)
--   ctx.health, ctx.armor, ctx.hunger, ctx.thirst
Config.ShowAchievements = true

Config.Achievements = {
    { id = 'rookie',     label = 'Rookie',      emoji = '\u{1F195}',
      desc = 'Spend 1 hour this week',
      check = function(ctx) return ctx.weeklySeconds >= 3600 end },

    { id = 'marathon',   label = 'Marathoner',  emoji = '\u{1F525}',
      desc = 'Play a 3h+ session',
      check = function(ctx) return ctx.sessionSeconds >= 3 * 3600 end },

    { id = 'grinder',    label = 'Grinder',     emoji = '\u{23F0}',
      desc = 'Play 10 hours this week',
      check = function(ctx) return ctx.weeklySeconds >= 10 * 3600 end },

    { id = 'saver',      label = 'Saver',       emoji = '\u{1FA99}',
      desc = 'Hold 100k in the bank',
      check = function(ctx) return ctx.bank >= 100000 end },

    { id = 'millionaire',label = 'Millionaire', emoji = '\u{1F4B0}',
      desc = 'Reach 1,000,000 in the bank',
      check = function(ctx) return ctx.bank >= 1000000 end },

    { id = 'lifesaver',  label = 'Lifesaver',   emoji = '\u{1F691}',
      desc = 'Serve as EMS',
      check = function(ctx) return ctx.jobGroup == 'ems' end },

    { id = 'on_duty',    label = 'On Duty',     emoji = '\u{1F46E}',
      desc = 'Serve as Police',
      check = function(ctx) return ctx.jobGroup == 'police' end },

    { id = 'wrench',     label = 'Wrench Hand', emoji = '\u{1F527}',
      desc = 'Work as a Mechanic',
      check = function(ctx) return ctx.jobGroup == 'mechanic' end },
}
